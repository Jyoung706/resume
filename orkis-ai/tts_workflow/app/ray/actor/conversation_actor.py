import ray
from pathlib import Path
from typing import Any, Dict, List, Tuple
from datetime import datetime
import asyncio
import json
import time

from core.static.rag_enum import RAG_STAT, RAG_TYPE

from tts_workflow.core.conf.config import config
from tts_workflow.core.conf.worker_conf.worker_config import (
    CompiledWorker,
    ProcConfig,
    WorkerConfig,
)

from tts_workflow.core.ray.actor.base_actor import BaseActor
from tts_workflow.core.conf.ray_config import ray_config

from tts_workflow.core.utils import CommonUtil

from tts_workflow.core.utils.async_util import fire_and_forget
from tts_workflow.core.vector_search.bootstrap import init_registry
from tts_workflow.core.vector_search.context import executor_scope

from tts_workflow.core.worker.worker_builder import build_worker
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.summary_result import SummaryResult
from tts_workflow.core.worker.dataclass.task import ConversationTask

from tts_workflow.core.static.redis_enum import PROC_STAT_CODE
from tts_workflow.core.static.work_enum import NODE, RESULT_CODE, GRAPH_STAT_TYPE

from tts_workflow.core.exceptions.base import CriticalError, PreprocessNotCompleted

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.utils.logger.state_history_logger import state_history_logger



@ray.remote(
    num_cpus=ray_config.CONVERSATION_ACTOR_NUM_CPUS,
    memory=ray_config.CONVERSATION_ACTOR_MEMORY_MB * 1024 * 1024
)
class ConversationActor(BaseActor):
    """
    워크플로우 실행 Actor
    """
    def __init__(self):
        
        # Service/Repository 등록
        init_registry()

        # 경로 setting
        self.CHAT_CONTEXT_DIR = config.CHAT_CONTEXT_DIR
        self.CHAT_SUMMARY_DIR = config.CHAT_SUMMARY_DIR
        self.WORKER_CONFIG_DIR = config.WORKER_CONFIG_DIR

        # 설정 setting
        self.TITLE_CONFIG = CommonUtil.get_config(config.TITLE_CONFIG_PATH)
        self.SUMMARY_CONFIG = CommonUtil.get_config(config.SUMMARY_CONFIG_PATH)

        # load worker steps and setting and compile
        self._define_worker_and_process_steps(config.BASIC_WORKER_PATH)

        # 변수 초기화
        self._init_var()

        # 강제 취소 
        self.canceling = False

        exec_logger.info(f"Conversation Actor Init")

    @executor_scope
    async def run(self, task_dict: Dict[str, Any]) -> None:
        self.task_dict = task_dict
        is_sql: bool = False
        RSCODE: RESULT_CODE = RESULT_CODE.ERROR

        from tts_workflow.core.redis.chat_redis_repository import ChatRedisRepository
        from tts_workflow.core.redis.redis_manager import RedisManager
        from tts_workflow.core.worker.dataclass.system_state import SystemState

        task = ConversationTask(**task_dict)
        exec_logger.info(f"[ACTOR] run() START")

        chat_redis_cli = ChatRedisRepository(
            redis_client=RedisManager().chat_client, id=task.chat_id
        )

        try:
            await chat_redis_cli.stat_start()
            await chat_redis_cli.proc_init_input(input=task.input)

            exec_logger.info(
                msg=f"Running worker(db_id: {task.db_id}, chatroom_id: {task.chatroom_id}, worker_id: {task.worker_id}"
            )

            # select compiled worker
            if self.compiled_workers.get(task.worker_id) is None:
                worker_config = self._get_worker_config(task.worker_id)
                self.compiled_workers[task.worker_id] = CompiledWorker(
                    worker=build_worker(worker_config)
                )

            self.compiled_workers[task.worker_id].last_used_at = datetime.now()
            worker = self.compiled_workers[task.worker_id].worker

            # set langchain input
            system_state = SystemState(
                chat_history=self._load_context(task.chatroom_id),
                task=task,
            )

            thread_config = {"configurable": {"thread_id": task.chatroom_id}}

            state_history_logger.info("=================================================================================================")

            # stream_mode(duplicate possible) :
            #  - debug : all data(input state, node metadata, execution logs, etc)
            #  - values : all input state
            #  - updates : only updates input state
            #  - messages : llm tokens metadata, but not work in this code
            async for chunk in worker.astream(system_state, thread_config, stream_mode="debug"):
                # [CHECK] debug 모드 => 단계 다 나오기는 하는데 system state 를 내가 최종 병합 해야 하네?

                if chunk["type"] == GRAPH_STAT_TYPE.start:
                    chat_redis_cli.stat_work()
                    # [CHECK] 이거 밖에 답이 없나..?
                    if chunk["payload"]["name"] != NODE.intent and self.cur_proc:
                        # 현재 work가 어떤 proc의 시작 노드인지 확인
                        start_proc_id = self._check_proc_id(chunk["payload"]["name"], self.cur_proc)
                        if start_proc_id is not None:
                            # 시작 상태(0)로 업데이트
                            chat_redis_cli.proc_update(start_proc_id, PROC_STAT_CODE.running)

                elif chunk["type"] == GRAPH_STAT_TYPE.end:
                    result = dict(chunk["payload"].get("result", {}))
                    if chunk["payload"]["name"] == NODE.intent:
                        self.rewritten_question = result.get("rewritten_question", task.question)
                        is_sql = result.get("requires_db_retrieval", False)

                        if is_sql:
                            p_result = await self._is_preprocess_completed(task.db_id)
                            self.cur_proc = self.procs_steps[task.worker_id]
                        else:
                            p_result = True
                            self.cur_proc = self.procs_steps["gen_conv"]

                        await chat_redis_cli.proc_init_step(procs=self.cur_proc)

                        if not p_result:
                            raise PreprocessNotCompleted

                    elif self.cur_proc:
                        # 현재 work가 어떤 proc의 종료 노드인지 확인
                        end_proc_id = self._check_proc_id(
                            chunk["payload"]["name"], self.cur_proc, start=False
                        )
                        if end_proc_id is not None:
                            # 종료 상태(1)로 업데이트
                            await chat_redis_cli.proc_update(end_proc_id, PROC_STAT_CODE.success)
                            self.latest_proc_id = end_proc_id

                    self.chat_log.extend(result.pop("__messages__", []))
                self._state_log(chunk=chunk, chat_id=task.chat_id)

            state_history_logger.info("=================================================================================================")

            if chunk["payload"].get("name", "") == NODE.final:
                exec_logger.info(f"FINAL RESULT: {chunk["payload"]}")
                self.final_answer = [value for key, value in chunk["payload"].get("result", []) if key == "final_answer"][0]
                if self.final_answer:
                    RSCODE = RESULT_CODE.SUCCESS
                    
        except CriticalError as e:
            RSCODE = RESULT_CODE.ERROR
            exec_logger.error(f"CriticalError in WorkerManager : {e}")
        except PreprocessNotCompleted as e:
            # 프리프로세싱 미진행 혹은 진행중으로 sql 답변 불가 오류
            RSCODE = RESULT_CODE.PREPROCESSING_NOT_COMPLETED
            exec_logger.info("Pre processing not completed")
        except Exception as e:
            RSCODE = RESULT_CODE.ERROR
            exec_logger.error(f"Error in WorkerManager : {e}")
        finally:
            if self.canceling:
                # 어차피 곧 죽을 거고 후속 작업 아무것도 하지마
                return

            asyncio.create_task(self.finalize(
                RSCODE=RSCODE,
                task_dict=self.task_dict,
                end_timestamp=int(time.time()),
                steps={k: v.process_id for k, v in self.cur_proc.items()} if self.cur_proc is not None else self.cur_proc,
                latest_proc_id=self.latest_proc_id,
                final_answer=self.final_answer,
                rewritten_question=self.rewritten_question,
                chat_log=self.chat_log,
                is_sql=is_sql,
            ))

            # 변수 초기화
            self._init_var()
    
    async def shutdown(self) -> Dict[str, Any]:
        self.canceling = True
        end_timestamp = int(time.time())

        exec_logger.info(f"Canceld Requested: {self.task_dict.get("chat_id", "Unknown")}")
        
        steps = {k: v.process_id for k, v in self.cur_proc.items()} if self.cur_proc is not None else self.cur_proc
        
        return {
            "RSCODE":RESULT_CODE.CANCLE,
            "task_dict": self.task_dict,
            "end_timestamp": end_timestamp,
            "steps": steps,
            "latest_proc_id": self.latest_proc_id,
            "final_answer": self.final_answer,
            "rewritten_question": self.rewritten_question,
            "chat_log": self.chat_log
        }

    async def finalize(
            self,
            RSCODE:RESULT_CODE,
            task_dict:Dict[str, Any],
            end_timestamp:int,
            steps:Dict[str, Any],
            latest_proc_id:int,
            final_answer:str,
            rewritten_question:str,
            chat_log:List[Chat],
            is_sql:bool = False
        ) -> None:
        exec_logger.info(f"Finalize Requested: {task_dict.get("chat_id", "Unknown")}")
        exec_logger.info(f"RSCODE: {RSCODE.value}")
        exec_logger.info(f"question: {rewritten_question}")
        exec_logger.info(f"answer: {final_answer}")

        from tts_workflow.core.redis.chat_redis_repository import ChatRedisRepository
        from tts_workflow.core.redis.redis_manager import RedisManager

        task = ConversationTask(**task_dict)
        chat_redis_cli = ChatRedisRepository(
            redis_client=RedisManager().chat_client, id=task.chat_id
        )

        await chat_redis_cli.proc_end(rs_code=RSCODE)
        end_timestamp = int(time.time())
        await chat_redis_cli.stat_end(end_timestamp=end_timestamp)
        
        # heap 비우기
        CommonUtil.malloc_trim()
        exec_logger.info(f"[ACTOR] run() END: {task.chat_id}")

        # 결과 정보 저장
        await self._save_context(
            task=task,
            answer=final_answer,
            rewritten_question=rewritten_question,
            summary=(RSCODE, is_sql, end_timestamp, steps, latest_proc_id),
            context=(chat_log,)
        )
        
    async def get_title(self, question: str, llm_model: str, api_key: str) -> str:
        """타이틀 생성 (LLMActor 사용)"""
        from tts_workflow.core.ray.actor_manager import get_llm_actor

        try:
            cfg = self.TITLE_CONFIG

            template_name = cfg.get('template_name')

            engine_config = cfg.get('engine_config', {})
            engine_config["engine_name"] = llm_model
            engine_config["api_key"] = api_key

            parser_name = cfg.get('parser_name')

            language = cfg.get('language', 'Korean')
            limit_characters = cfg.get('limit_characters', 15)

            llm_actor = get_llm_actor()

            response, _ = (await llm_actor.llm_chain_calls.remote(
                template_name=template_name,
                engine_config=engine_config,
                parser_name=parser_name,
                request_list=[{
                    "QUESTION": question,
                    "LANGUAGE": language,
                    "LIMIT_CHARACTERS": limit_characters,
                }],
                step="generate_title",
            ))[0][0]

            return response
        except Exception as e:
            exec_logger.error(f"Generate Title failed: {e}")
            return None
    
    def _init_var(self) -> None:
        self.task_dict: Dict[str, Any] = dict()
        self.cur_proc: Dict[int, ProcConfig] = None
        self.latest_proc_id: int = 0
        self.final_answer: str = ""
        self.rewritten_question: str = ""
        self.chat_log: List[Chat] = []

    def _define_worker_and_process_steps(self, basic_worker_path: Path) -> None:
        self.compiled_workers = dict()
        self.procs_steps = dict()

        # set general question process steps
        self.procs_steps["gen_conv"] = {
            0: ProcConfig(process_id="general", works=["general_llm", NODE.final])
        }

        # load basic worker configs
        worker_configs = [
            self._get_worker_config(p.stem)
            for p in Path(self.WORKER_CONFIG_DIR).glob("*.yaml")
            if p.stem in CommonUtil.get_config(basic_worker_path)
        ]

        # build worker
        for worker_config in worker_configs:
            self.compiled_workers[worker_config.worker_id] = CompiledWorker(
                worker=build_worker(worker_config)
            )
            self.procs_steps[worker_config.worker_id] = {
                pInd: proc for pInd, proc in enumerate(worker_config.procs)
            }

    def _get_worker_config(self, worker_id: str) -> WorkerConfig:
        worker_config = CommonUtil.get_config(self.WORKER_CONFIG_DIR / f"{worker_id}.yaml")
        worker_config["worker_id"] = worker_id
        return WorkerConfig(**worker_config)
    
    def _load_context(
        self, 
        chatroom_id: str, 
        max_history: int = 4
    ) -> str:
        try:
            summary_dir = self.CHAT_CONTEXT_DIR / chatroom_id / "summary"

            if not summary_dir.exists():
                return ""

            # UUID7 기반이므로 파일명 정렬하면 시간순 정렬됨
            summary_files = sorted(summary_dir.glob("*.summary"))

            if not summary_files:
                return ""

            # 최근 N개만 사용
            recent_files = summary_files[-max_history:] if len(summary_files) > max_history else summary_files

            # 파일 내용을 읽어서 하나의 문자열로 합침
            chat_histories = []
            for summary_file in recent_files:
                content = summary_file.read_text(encoding="utf-8").strip()
                if content:  # 빈 내용 제외
                    chat_histories.append(content)

            # 줄바꿈으로 구분하여 하나의 문자열로 반환
            return "\n".join(chat_histories)

        except Exception as e:
            exec_logger.error(f"load_history {chatroom_id} failed: {e}")
            return ""
    
    async def _save_context(
            self, 
            task:ConversationTask, 
            answer:str, 
            rewritten_question:str,
            summary:Tuple[Any],
            context:Tuple[Any],
        ) -> None:
        try:
            """요약 정보 저장 (ai to appilcation with nas)"""
            RSCODE, is_sql, end_timestamp, steps, last_step = summary

            result = SummaryResult()
            
            if RSCODE == RESULT_CODE.SUCCESS:
                chat_summary = await self._get_summary(question=rewritten_question,
                                            answer=answer,
                                            llm_model=task.llm_model,
                                            api_key=task.api_key)
                if chat_summary is not None:
                    result.success = True
                    result.q = chat_summary.get("q", "")
                    result.a = chat_summary.get("a", "")
                    result.steps = steps
                    result.last_step = last_step
                    result.end_time = end_timestamp
                    if is_sql: result.sql= answer
            else:
                result.q = task.question
                result.end_time = end_timestamp
                
                if steps is not None:
                    result.steps = steps
                    result.last_step = last_step if last_step is not None else 0
                    
            # application 용
            today = datetime.now().strftime("%y%m%d")
            summary_dir = self.CHAT_SUMMARY_DIR / task.chatroom_id / today
            summary_dir.mkdir(parents=True, exist_ok=True)
            
            summary_file = summary_dir / f"{task.chat_id}.json"
            summary_file.write_text(result.model_dump_json(), encoding='utf-8')
        except Exception as e:
            exec_logger.error(f"Error in Chat Summary for Application: {e}")
        
        try:
            """대화 컨텍스트 저장"""
            chat_log, = context
            
            context_root_dir = self.CHAT_CONTEXT_DIR / task.chatroom_id
            context_root_dir.mkdir(parents=True, exist_ok=True)
            
            # 맥락 유지 용
            context_dir = context_root_dir / "summary"
            context_dir.mkdir(parents=True, exist_ok=True)

            # q/a context 저장 - rewritten_question 우선 사용 (없으면 원본)
            question = rewritten_question if rewritten_question else task.question
            context = f"Q:{question}\nA:{answer}"
            context_file = context_dir / f"{task.chat_id}.summary"
            context_file.write_text(context, encoding='utf-8')

            # chat full 로그 저장
            chat_file = context_root_dir / f"{task.chat_id}.log"
            with open(chat_file, "a", encoding="utf-8") as f:
                for chat in chat_log:
                    f.write(
                        json.dumps(chat.model_dump(), ensure_ascii=False) + "\n"
                    )

        except Exception as e:
            exec_logger.error(f"Error in Chat Summary for Maintain Context: {e}")
        
    async def _get_summary(self, question: str, answer: str, llm_model: str, api_key: str) -> str:
        """LLM으로 요약 생성 (LLMActor 사용)"""
        from tts_workflow.core.ray.actor_manager import get_llm_actor

        try:
            cfg = self.SUMMARY_CONFIG.get('context', {})

            template_name = cfg.get('template_name')

            engine_config = cfg.get('engine_config', {})
            engine_config["engine_name"] = llm_model
            engine_config["api_key"] = api_key

            parser_name = cfg.get('parser_name')

            language = cfg.get('language', 'Korean')
            limit_characters = cfg.get('limit_characters', 100)

            llm_actor = get_llm_actor()
            response, _ = (await llm_actor.llm_chain_calls.remote(
                template_name=template_name,
                engine_config=engine_config,
                parser_name=parser_name,
                request_list=[{
                    "QUESTION": question,
                    "ANSWER": answer,
                    "LANGUAGE": language,
                    "LIMIT_CHARACTERS": limit_characters,
                }],
                step="generate_summary"
            ))[0][0]

            return response
        except Exception as e:
            exec_logger.error(f"Generate Summary failed: {e}")
            return None
    
    @staticmethod
    def _check_proc_id(work_name: str, procs: Dict[int, Any], start=True) -> int:
        """해당 work가 어떤 proc의 시작/종료 노드인지 확인하고, 해당 proc_id를 반환"""
        if start : wInd = 0
        else : wInd = -1

        for seq, proc in procs.items():
            if proc.works and work_name == proc.works[wInd]:
                return seq

    @staticmethod
    async def _is_preprocess_completed(db_id: str) -> bool:
        from tts_workflow.core.redis.chat_redis_repository import ChatRedisRepository
        from tts_workflow.core.redis.redis_manager import RedisManager
        from tts_workflow.app.vector_search.service.faiss_preprocess_service import FaissPreprocessService

        try:
            # set redis db
            chat_redis_cli = ChatRedisRepository(
                redis_client=RedisManager().chat_client, id=db_id
            )

            rag_types = [RAG_TYPE.SCHEMA, RAG_TYPE.DATA]

            for type in rag_types:
                if await chat_redis_cli.preprocess_exist(type=type):
                    return False

                with FaissPreprocessService() as svc:
                    result = svc.status(type)

                if result is not RAG_STAT.SUCCESS:
                    return False

            return True
        except Exception as e:
            exec_logger.error(f"Error in Preprocess Status Check: {e}")
            return False
    
    @staticmethod
    @fire_and_forget
    async def _state_log(chunk: Dict[str, Any], chat_id:str) -> None:
        try:
            """langraph log 저장"""

            chunk_type = chunk.get("type", "")
            execution_time = chunk.get("timestamp", 0)

            payload = chunk.get("payload", {})

            work_name = payload.get("name", 'N/A')
            result = dict(payload.get("result", {}))
            result.pop("__messages__", [])


            # 공통 필드
            base_info = {
                "chat_id":chat_id,
                "step number": chunk_type,
                "type": chunk_type,
                "execution time": execution_time
            }
            
            # 타입별 추가 정보
            type_specific = {
                "task": {
                    "work name": work_name,
                    "input": ""
                },
                "task_result": {
                    "work name": work_name,  
                    "result": result
                },
                "checkpoint": {},
            }
            
            # 로그 데이터 병합
            log_data = {**base_info, **type_specific.get(chunk_type, {"payload": payload})}
            
            # 로그 문자열 생성
            state_log = "\n".join(f"            {k} : {v}" for k, v in log_data.items())
            
            # 히스토리 태그 설정 및 로깅
            history_tag = {"task": "START", "task_result": "END"}.get(chunk_type, "NONE")
            
            if chunk_type == GRAPH_STAT_TYPE.checkpoint:
                exec_logger.info(f"---{chunk_type}---")
            else:
                exec_logger.info(f"---{history_tag}: {work_name}---")
            
            state_history_logger.info(f"\n{state_log}")
            state_history_logger.info("-" * 97)
        except Exception as e:
            exec_logger.error(f"Error in Save Langraph State Log: {e}")
    
    