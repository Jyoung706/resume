from langchain_core.callbacks.base import AsyncCallbackHandler
from tts_workflow.core.redis.redis_manager import RedisManager
from tts_workflow.core.redis.chat_redis_repository import ChatRedisRepository
from tts_workflow.core.redis.stream_redis_repository import StreamRedisRepository
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.exceptions.base import LLMAPIError
from tts_workflow.core.static.redis_enum import PROC_STAT_CODE


class AsyncRedisStreamHandler(AsyncCallbackHandler):
    """
    비동기 Redis 스트림 핸들러

    LangChain AsyncCallbackHandler를 상속하여 native async 콜백 처리.
    asyncio.run() 안티패턴 제거.
    """

    def __init__(self, proc_id: int, chat_id: str):
        super().__init__()
        self.raise_error = True
        self.end = False

        self.chat_repo = ChatRedisRepository(
            redis_client=RedisManager().chat_client, id=chat_id
        )
        self.stream_repo = StreamRedisRepository(
            redis_client=RedisManager().stage_client, id=chat_id
        )

        self.proc_id = proc_id

    async def on_llm_start(self, serialized, prompts, **kwargs):
        """LLM 시작 시 호출 (비동기)"""
        msg_id = await self.stream_repo.stream_start()
        self.chat_repo.proc_update(
            proc_id=self.proc_id, new_status=PROC_STAT_CODE.running, msg_id=msg_id
        )
        exec_logger.debug("[Start LLM]")

    async def on_llm_new_token(self, token: str, **kwargs):
        """새 토큰 수신 시 호출 (비동기)"""
        if isinstance(token, list):
            token = "".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in token
            )
        self.stream_repo.streaming(token=token)

    async def on_llm_end(self, response, **kwargs):
        """LLM 종료 시 호출 (비동기)"""
        self.stream_repo.stream_end()
        self.end = True
        exec_logger.debug("[End LLM]")

    async def on_llm_error(self, error, **kwargs):
        """LLM 에러 시 호출 (비동기)"""
        if not self.end:
            self.stream_repo.stream_end()
        raise LLMAPIError(f"[Error LLM]: {error}")
