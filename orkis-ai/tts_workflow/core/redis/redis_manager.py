import threading
from typing import Dict
import redis.asyncio as aioredis

from core.conf.config import redisChatConfig, redisStageConfig
from tts_workflow.app.utils.logger.exec_logger import exec_logger


class RedisManager:
    """Redis Connection Pool 관리자 (Singleton) - Async"""

    _instance = None
    _lock = threading.Lock()
    _initialized = False

    def __new__(cls):
        if cls._instance is None or not cls._initialized:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(RedisManager, cls).__new__(cls)
                    cls._instance._init()
                    cls._initialized = True

        return cls._instance

    def _init(self):
        self._chat_client = aioredis.Redis(
            host=redisChatConfig.HOST,
            port=redisChatConfig.PORT,
            db=redisChatConfig.DB_ID,
            decode_responses=redisChatConfig.DECODE_RES,
            max_connections=redisChatConfig.MAX_CON,
            retry_on_timeout=redisChatConfig.RETRY_ON_TIMEOUT,
            socket_timeout=redisChatConfig.TIMEOUT,
        )

        self._stage_client = aioredis.Redis(
            host=redisStageConfig.HOST,
            port=redisStageConfig.PORT,
            db=redisStageConfig.DB_ID,
            decode_responses=redisStageConfig.DECODE_RES,
            max_connections=redisStageConfig.MAX_CON,
            retry_on_timeout=redisStageConfig.RETRY_ON_TIMEOUT,
            socket_timeout=redisStageConfig.TIMEOUT,
        )

    @property
    def chat_client(self) -> aioredis.Redis:
        return self._chat_client

    @property
    def stage_client(self) -> aioredis.Redis:
        return self._stage_client

    async def health_check(self) -> Dict[str, bool]:
        """Redis 연결 상태 체크"""
        try:
            await self._chat_client.ping()
            chat_healthy = True
        except Exception:
            chat_healthy = False

        try:
            await self._stage_client.ping()
            stage_healthy = True
        except Exception:
            stage_healthy = False

        return {
            "chat_client": chat_healthy,
            "stage_client": stage_healthy,
            "all": chat_healthy and stage_healthy,
        }
