from typing import Any, Dict, List, Tuple
from tts_workflow.core.redis.redis_manager import RedisManager
from tts_workflow.core.redis.chat_redis_repository import ChatRedisRepository
from tts_workflow.core.redis.stream_redis_repository import StreamRedisRepository
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.static.redis_enum import PROC_STAT_CODE
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class Final(Work):
    def __init__(
        self,
        conf:WorkInput,
        template_name: str = None,
        engine_config: str = None,
        parser_name: str = None,
        language: str = "Korean",
        limit_characters: int = 500,
        delimiter: str = "$$",
    ):
        super().__init__(conf)
        self.template_name = template_name
        self.engine_config = engine_config
        self.parser_name = parser_name
        self.language = language
        self.limit_characters = limit_characters
        self.delimiter = delimiter

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:

        final_answer = None
        if state.requires_db_retrieval:
            try:
                final_answer = state.evaluation_result['selected_candidate'].strip()

                # 최종 응답 스트리밍
                chat_repo = ChatRedisRepository(
                    redis_client=RedisManager().chat_client, id=state.task.chat_id
                )
                stream_repo = StreamRedisRepository(
                    redis_client=RedisManager().stage_client, id=state.task.chat_id
                )

                msg_id = await stream_repo.stream_start()
                chat_repo.proc_update(proc_id=self.proc_id, new_status=PROC_STAT_CODE.running, msg_id=msg_id)
                await stream_repo.streaming(token=final_answer)
                await stream_repo.stream_end()

            except Exception as e:
                exec_logger.error(f"Error Parsing Final answer: {e}")
                final_answer = None
        else:
            final_answer = state.general_answer
    
        return {"final_answer": final_answer}, []
