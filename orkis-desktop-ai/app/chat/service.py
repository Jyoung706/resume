"""
Chat Service - 채팅 워크플로우 비즈니스 로직 (프로토콜 독립).

dict + asyncio.Event만 받아 HTTP/CLI/테스트 등 어디서든 호출 가능.
LangGraph 워크플로우 실행, 워커 캐시, LLM Actor, 컨텍스트 저장 담당.

Cloud ConversationActor.run() 로직을 로컬 환경으로 재구성 (Ray/Redis 제거).
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Dict, List, Optional


def _log(msg: str):
    print(msg, file=sys.stderr, flush=True)


if TYPE_CHECKING:
    from tts_workflow.core.conf.worker_conf.worker_config import (
        CompiledWorker,
        ProcConfig,
        WorkerConfig,
    )
    from tts_workflow.core.static.work_enum import GRAPH_STAT_TYPE, NODE, RESULT_CODE
    from tts_workflow.core.utils import CommonUtil
    from tts_workflow.core.worker.worker_builder import build_worker


# ──────────────────────────────────────────────────────
# Lazy import 캐시 (프로세스 공유)
# ──────────────────────────────────────────────────────

_lazy_loaded = False
config = None
CommonUtil = None
build_worker = None
RESULT_CODE = None
GRAPH_STAT_TYPE = None
NODE = None
WorkerConfig = None
ProcConfig = None
CompiledWorker = None


def _sync_lazy_import():
    """무거운 tts_workflow 모듈을 동기적으로 로딩 (별도 스레드에서 실행)"""
    global _lazy_loaded, config, CommonUtil, build_worker
    global RESULT_CODE, GRAPH_STAT_TYPE, NODE, WorkerConfig, ProcConfig, CompiledWorker
    if _lazy_loaded:
        return

    _log("[ChatService:init] 1/6 Loading config...")
    from tts_workflow.core.conf.config import config as _config
    config = _config

    _log("[ChatService:init] 1/6 Loading worker config...")
    from tts_workflow.core.conf.worker_conf.worker_config import (
        CompiledWorker as _CompiledWorker,
        ProcConfig as _ProcConfig,
        WorkerConfig as _WorkerConfig,
    )
    WorkerConfig = _WorkerConfig
    ProcConfig = _ProcConfig
    CompiledWorker = _CompiledWorker

    _log("[ChatService:init] 1/6 Loading enums...")
    from tts_workflow.core.static.work_enum import (
        GRAPH_STAT_TYPE as _GRAPH_STAT_TYPE,
        NODE as _NODE,
        RESULT_CODE as _RESULT_CODE,
    )
    RESULT_CODE = _RESULT_CODE
    GRAPH_STAT_TYPE = _GRAPH_STAT_TYPE
    NODE = _NODE

    _log("[ChatService:init] 1/6 Loading utils...")
    from tts_workflow.core.utils import CommonUtil as _CommonUtil
    CommonUtil = _CommonUtil

    _log("[ChatService:init] 1/6 Loading worker builder...")
    from tts_workflow.core.worker.worker_builder import build_worker as _build_worker
    build_worker = _build_worker

    _lazy_loaded = True
    _log("[ChatService:init] 1/6 Workflow modules loaded")


# ──────────────────────────────────────────────────────
# 모듈 수준 상태
# ──────────────────────────────────────────────────────

_initialized = False
_init_lock = asyncio.Lock()
_compiled_workers: Dict[str, "CompiledWorker"] = {}
_procs_steps: Dict[str, Dict[int, "ProcConfig"]] = {}
_local_llm_actor = None
_title_config = None


# ──────────────────────────────────────────────────────
# 공개 초기화 진입점
# ──────────────────────────────────────────────────────

async def initialize():
    """외부 호출용 초기화 - idempotent.

    소켓 연결 직후 background init 등에서 호출. 여러 번 호출되어도 실제 초기화는 1회만.
    """
    await _init_once()


async def _init_once():
    """
    최초 1회 초기화

    1) Vector Search Registry (SQL 경로용, 실패해도 general 동작)
    2) Executor 로컬 대체 등록
    3) LocalLLMActor 생성 + llm_provider에 등록
    4) Worker 사전 컴파일
    5) 타이틀 생성 설정 로드
    """
    global _initialized, _local_llm_actor, _title_config
    async with _init_lock:
        if _initialized:
            return

        await asyncio.to_thread(_sync_lazy_import)

        # 1) Registry (SQL 경로용, 실패 시 general만 동작)
        _log("[ChatService:init] 2/6 Initializing vector search registry...")
        try:
            from tts_workflow.core.vector_search.bootstrap import init_registry
            init_registry()
            _log("[ChatService:init] 2/6 Registry initialized")
        except Exception as e:
            _log(f"[ChatService:init] 2/6 Registry skipped: {e}")
        await asyncio.sleep(0)

        # 2) Executor 로컬 대체 (Ray Actor 불필요)
        _log("[ChatService:init] 3/6 Patching executors...")
        try:
            from app.socket.local_resource_actors import LocalOpenAIVectorizer, LocalFaissReader
            from tts_workflow.core.vector_search.executor.config import ExecutorConfig
            from tts_workflow.app.vector_search.executor.openai_vectorizer import OpenAIVectorizer
            from tts_workflow.app.vector_search.executor.faiss_reader import FaissReader
            from tts_workflow.core.vector_search.registry import Registry

            for cls in list(Registry._components.keys()):
                for attr_name in list(vars(cls).keys()):
                    attr = vars(cls).get(attr_name)
                    if isinstance(attr, ExecutorConfig):
                        if attr.executor_cls is OpenAIVectorizer:
                            attr.executor_cls = LocalOpenAIVectorizer
                        elif attr.executor_cls is FaissReader:
                            attr.executor_cls = LocalFaissReader

            from tts_workflow.core.vector_search.executor.base_executor import BaseReader
            BaseReader._root_path = config.DB_NETWORK_PATH

            _log("[ChatService:init] 3/6 Executors patched")
        except Exception as e:
            _log(f"[ChatService:init] 3/6 Executor patch skipped: {e}")
        await asyncio.sleep(0)

        # 3) LocalLLMActor 생성 + llm_provider에 등록
        _log("[ChatService:init] 4/6 Creating LLM actor...")
        from app.socket.local_llm_actor import LocalLLMActor
        from tts_workflow.core.llm.llm_provider import set_llm_actor

        _local_llm_actor = LocalLLMActor()
        set_llm_actor(_local_llm_actor)
        _log("[ChatService:init] 4/6 LLM actor ready")
        await asyncio.sleep(0)

        # 4) Worker 사전 컴파일
        _log("[ChatService:init] 5/6 Compiling workers...")
        _define_workers()
        _log("[ChatService:init] 5/6 Workers compiled")
        await asyncio.sleep(0)

        # 5) 타이틀 생성 설정 로드
        _log("[ChatService:init] 6/6 Loading title config...")
        try:
            _title_config = CommonUtil.get_config(config.TITLE_CONFIG_PATH)
            _log("[ChatService:init] 6/6 Title config loaded")
        except Exception as e:
            _log(f"[ChatService:init] 6/6 Title config skipped: {e}")

        _initialized = True
        _log("[ChatService:init] Ready")


def _define_workers():
    """YAML 기반 Worker 사전 컴파일"""
    _procs_steps["gen_conv"] = {
        0: ProcConfig(process_id="general", works=["general_llm", NODE.final])
    }

    basic_workers = CommonUtil.get_config(config.BASIC_WORKER_PATH)
    worker_config_dir = Path(config.WORKER_CONFIG_DIR)

    for p in worker_config_dir.glob("*.yaml"):
        if p.stem not in basic_workers:
            continue
        try:
            wc_dict = CommonUtil.get_config(p)
            wc_dict["worker_id"] = p.stem
            wc = WorkerConfig(**wc_dict)

            _compiled_workers[wc.worker_id] = CompiledWorker(
                worker=build_worker(wc)
            )
            _procs_steps[wc.worker_id] = {
                i: proc for i, proc in enumerate(wc.procs)
            }
            _log(f"[ChatService] Worker compiled: {wc.worker_id}")
        except Exception as e:
            _log(f"[ChatService] Worker compile failed ({p.stem}): {e}")


# ──────────────────────────────────────────────────────
# 컨텍스트 관리 (디스크 I/O)
# ──────────────────────────────────────────────────────

def _load_context(chatroom_id: str, max_history: int = 4) -> str:
    """디스크에서 최근 N개 .summary 파일 로드"""
    try:
        summary_dir = Path(config.CHAT_CONTEXT_DIR) / chatroom_id / "summary"
        if not summary_dir.exists():
            return ""

        summary_files = sorted(summary_dir.glob("*.summary"))
        if not summary_files:
            return ""

        recent = summary_files[-max_history:]
        histories = []
        for f in recent:
            content = f.read_text(encoding="utf-8").strip()
            if content:
                histories.append(content)

        return "\n".join(histories)
    except Exception as e:
        _log(f"[ChatService] _load_context failed: {e}")
        return ""


def _save_summary(
    session_id: str,
    chat_id: str,
    question: str,
    answer: str,
    is_sql: bool,
    success: bool,
    steps: dict = None,
    last_step: int = None,
) -> None:
    """채팅 이력용 Summary JSON 저장 (Backend ChatHistoryService가 읽음)"""
    try:
        from tts_workflow.core.worker.dataclass.summary_result import SummaryResult

        result = SummaryResult()
        result.q = question
        result.end_time = int(datetime.now().timestamp())

        if success:
            result.success = True
            result.a = answer
            if is_sql:
                result.sql = answer
            if steps is not None:
                result.steps = steps
                result.last_step = last_step if last_step is not None else 0
        else:
            if steps is not None:
                result.steps = steps
                result.last_step = last_step if last_step is not None else 0

        today = datetime.now().strftime("%y%m%d")
        summary_dir = Path(config.CHAT_SUMMARY_DIR) / session_id / today
        summary_dir.mkdir(parents=True, exist_ok=True)

        summary_file = summary_dir / f"{chat_id}.json"
        summary_file.write_text(result.model_dump_json(), encoding="utf-8")

        _log(f"[ChatService] Summary saved: {session_id}/{today}/{chat_id}.json")
    except Exception as e:
        _log(f"[ChatService] _save_summary failed: {e}")


def _save_context(
    chatroom_id: str,
    chat_id: str,
    question: str,
    answer: str,
    chat_log: list = None,
) -> None:
    """Q/A 컨텍스트 디스크 저장"""
    try:
        context_root = Path(config.CHAT_CONTEXT_DIR) / chatroom_id
        summary_dir = context_root / "summary"
        summary_dir.mkdir(parents=True, exist_ok=True)

        context_text = f"Q:{question}\nA:{answer}"
        summary_file = summary_dir / f"{chat_id}.summary"
        summary_file.write_text(context_text, encoding="utf-8")

        if chat_log:
            log_file = context_root / f"{chat_id}.log"
            with open(log_file, "a", encoding="utf-8") as f:
                for chat in chat_log:
                    if hasattr(chat, "model_dump"):
                        f.write(
                            json.dumps(chat.model_dump(), ensure_ascii=False) + "\n"
                        )
                    else:
                        f.write(json.dumps(chat, ensure_ascii=False) + "\n")

        _log(f"[ChatService] Context saved: {chatroom_id}/{chat_id}")
    except Exception as e:
        _log(f"[ChatService] _save_context failed: {e}")


# ──────────────────────────────────────────────────────
# 유틸리티
# ──────────────────────────────────────────────────────

def _check_proc_id(
    work_name: str, procs: Dict[int, ProcConfig], start: bool = True
) -> Optional[int]:
    """해당 work가 어떤 proc의 시작/종료 노드인지 확인"""
    w_ind = 0 if start else -1
    for seq, proc in procs.items():
        if proc.works and work_name == proc.works[w_ind]:
            return seq
    return None


async def _generate_and_send_title(
    transport,
    chatId: str,
    sessionId: str,
    question: str,
    modelId: str,
    apiKey: str,
) -> None:
    """타이틀 생성 후 transport 전송 (백그라운드 태스크)"""
    from tts_workflow.core.transport.events import WorkflowEvent
    try:
        cfg = _title_config
        if not cfg:
            return

        template_name = cfg.get("template_name")
        engine_config = cfg.get("engine_config", {}).copy()
        engine_config["engine_name"] = modelId
        engine_config["api_key"] = apiKey
        parser_name = cfg.get("parser_name")
        language = cfg.get("language", "Korean")
        limit_characters = cfg.get("limit_characters", 15)

        response, _ = (
            await _local_llm_actor._llm_chain_calls(
                template_name=template_name,
                engine_config=engine_config,
                parser_name=parser_name,
                request_list=[
                    {
                        "QUESTION": question,
                        "LANGUAGE": language,
                        "LIMIT_CHARACTERS": limit_characters,
                    }
                ],
                step="generate_title",
            )
        )[0][0]

        if response:
            await transport.emit(WorkflowEvent.CHAT_TITLE, {
                "chatId": chatId,
                "sessionId": sessionId,
                "title": response,
            })
            _log(f"[ChatService] Title generated: {response}")
    except Exception as e:
        _log(f"[ChatService] Generate title failed: {e}")


def _get_default_worker_id() -> str:
    """기본 워커 ID 반환"""
    basic = CommonUtil.get_config(config.BASIC_WORKER_PATH)
    return basic[0] if basic else "it_ir_ss_cg_ut"


# ──────────────────────────────────────────────────────
# 공개 API
# ──────────────────────────────────────────────────────

async def run_chat(data: dict, cancel_event: asyncio.Event):
    """
    채팅 워크플로우 실행 - 프로토콜 독립.

    1. 초기화 (최초 1회)
    2. Transport / cancel_event 설정
    3. executor_scope ContextVar 설정
    4. 대화 컨텍스트 로드
    5. LangGraph worker.astream() 실행
    6. debug 청크 -> transport 이벤트 변환
    7. 완료 후 컨텍스트 저장

    cancel_event: ChatTaskManager가 생성해 전달. pre-cancelled 상태일 수 있음.
    """
    await _init_once()

    chatId = data.get("chatId", "")
    sessionId = data.get("sessionId", "")
    content = data.get("content", "")
    modelId = data.get("modelId", "gpt-4o")
    apiKey = data.get("apiKey") or os.environ.get("OPENAI_API_KEY", "")
    workerId = data.get("workerId") or _get_default_worker_id()

    from tts_workflow.core.transport.context import get_transport, set_cancel_event
    from tts_workflow.core.transport.events import WorkflowEvent

    transport = get_transport()

    # pre-cancelled 상태 확인
    if cancel_event.is_set():
        await transport.emit(WorkflowEvent.CHAT_COMPLETE, {
            "chatId": chatId,
            "code": RESULT_CODE.CANCLE.value,
            "cancelled": True,
        })
        return

    # stream_handler 등이 ContextVar로 cancel_event에 접근하도록 등록
    set_cancel_event(cancel_event)

    task_dict = {
        "chatroom_id": sessionId,
        "question": content,
        "db_id": data.get("dbId", ""),
        "evidence": "",
        "topics": [],
        "worker_id": workerId,
        "llm_model": modelId,
        "api_key": apiKey,
        "chat_id": chatId,
        "input": {"question": content},
    }

    from tts_workflow.core.vector_search.context import (
        _current_task,
        _executors,
        _close_all_executors,
    )

    task_token = _current_task.set(task_dict)
    exec_token = _executors.set({})

    is_sql = False
    final_answer = ""
    rewritten_question = ""
    chat_log: List = []
    cur_proc: Optional[Dict[int, ProcConfig]] = None
    RSCODE = RESULT_CODE.ERROR

    # 타이틀 생성 (답변 스트리밍과 병렬)
    if data.get("generateTitle", False):
        asyncio.create_task(
            _generate_and_send_title(
                transport, chatId, sessionId, content, modelId, apiKey,
            )
        )

    try:
        from tts_workflow.core.worker.dataclass.system_state import SystemState
        from tts_workflow.core.worker.dataclass.task import ConversationTask

        task = ConversationTask(**task_dict)

        # Worker 캐시 조회 / 빌드
        if workerId not in _compiled_workers:
            wc_dict = CommonUtil.get_config(
                Path(config.WORKER_CONFIG_DIR) / f"{workerId}.yaml"
            )
            wc_dict["worker_id"] = workerId
            wc = WorkerConfig(**wc_dict)
            compiled = await asyncio.to_thread(build_worker, wc)
            _compiled_workers[workerId] = CompiledWorker(worker=compiled)
            _procs_steps[workerId] = {
                i: proc for i, proc in enumerate(wc.procs)
            }

        _compiled_workers[workerId].last_used_at = datetime.now()
        worker = _compiled_workers[workerId].worker

        chat_history = await asyncio.to_thread(_load_context, sessionId)
        system_state = SystemState(chat_history=chat_history, task=task)

        async for chunk in worker.astream(system_state, stream_mode="debug"):
            if cancel_event.is_set():
                break

            if chunk["type"] == GRAPH_STAT_TYPE.start:
                name = chunk["payload"]["name"]

                if name != NODE.intent and cur_proc and is_sql:
                    proc_seq = _check_proc_id(name, cur_proc)
                    if proc_seq is not None:
                        await transport.emit(WorkflowEvent.CHAT_STEP_UPDATE, {
                            "chatId": chatId,
                            "id": proc_seq,
                            "stat": 0,
                        })

            elif chunk["type"] == GRAPH_STAT_TYPE.end:
                result = dict(chunk["payload"].get("result", {}))
                name = chunk["payload"]["name"]

                if name == NODE.intent:
                    rewritten_question = result.get("rewritten_question", content)
                    is_sql = result.get("requires_db_retrieval", False)
                    chatType = "sql" if is_sql else "general"

                    if is_sql:
                        cur_proc = _procs_steps.get(workerId, {})
                    else:
                        cur_proc = _procs_steps["gen_conv"]

                    await transport.emit(WorkflowEvent.CHAT_TYPE, {
                        "chatId": chatId,
                        "chatType": chatType,
                    })

                    if is_sql and cur_proc:
                        label_map = {
                            "generate_hint": "Hint",
                            "schema_linking": "스키마",
                            "generate_sql": "SQL",
                            "evaluate": "검증",
                        }
                        steps = [
                            {
                                "id": str(seq),
                                "name": proc.process_id,
                                "label": label_map.get(proc.process_id, f"Step {seq + 1}"),
                                "stat": 0,
                            }
                            for seq, proc in cur_proc.items()
                            if proc.process_id != NODE.final
                        ]
                        await transport.emit(WorkflowEvent.CHAT_STEPS, {
                            "chatId": chatId,
                            "steps": steps,
                        })

                elif name == NODE.final:
                    final_answer = result.get("final_answer", "")
                    if final_answer:
                        RSCODE = RESULT_CODE.SUCCESS

                elif cur_proc and is_sql:
                    proc_seq = _check_proc_id(name, cur_proc, start=False)
                    if proc_seq is not None:
                        await transport.emit(WorkflowEvent.CHAT_STEP_UPDATE, {
                            "chatId": chatId,
                            "id": proc_seq,
                            "stat": 1,
                        })

                chat_log.extend(result.pop("__messages__", []))

        if cancel_event.is_set():
            await transport.emit(WorkflowEvent.CHAT_COMPLETE, {
                "chatId": chatId,
                "code": RESULT_CODE.CANCLE.value,
                "cancelled": True,
            })
        else:
            await transport.emit(WorkflowEvent.CHAT_COMPLETE, {
                "chatId": chatId,
                "code": RSCODE.value,
                "sqlQuery": final_answer if is_sql else None,
                "chatType": "sql" if is_sql else "general",
            })

    except Exception as e:
        _log(f"[ChatService] Error in run_chat - {e}")
        traceback.print_exc()
        await transport.emit(WorkflowEvent.CHAT_ERROR, {
            "chatId": chatId,
            "code": RESULT_CODE.ERROR.value,
            "message": str(e),
        })
    finally:
        # 엔트리 정리는 ChatTaskManager.submit()이 등록한 add_done_callback에서 자동 처리
        _close_all_executors()
        _current_task.reset(task_token)
        _executors.reset(exec_token)

        if RSCODE == RESULT_CODE.SUCCESS and final_answer:
            await asyncio.to_thread(
                _save_context,
                chatroom_id=sessionId,
                chat_id=chatId,
                question=rewritten_question or content,
                answer=final_answer,
                chat_log=chat_log,
            )

        # 채팅 이력용 Summary JSON 저장
        steps_dict = None
        last_step_val = None
        if cur_proc:
            steps_dict = {
                str(seq): proc.process_id
                for seq, proc in cur_proc.items()
                if proc.process_id != NODE.final
            }
            last_step_val = max(steps_dict.keys(), default=None)
            if last_step_val is not None:
                last_step_val = int(last_step_val)

        await asyncio.to_thread(
            _save_summary,
            session_id=sessionId,
            chat_id=chatId,
            question=rewritten_question or content,
            answer=final_answer,
            is_sql=is_sql,
            success=(RSCODE == RESULT_CODE.SUCCESS),
            steps=steps_dict,
            last_step=last_step_val,
        )


async def cancel_chat(chatId: str):
    """채팅 취소 - ChatTaskManager에 위임.

    활성 채팅이 있으면 cancel_event.set(),
    chat:start 이전에 cancel이 도착하면 pre-cancel 엔트리 등록.
    """
    from core.task_manager import chat_task_manager
    await chat_task_manager.cancel(chatId)
