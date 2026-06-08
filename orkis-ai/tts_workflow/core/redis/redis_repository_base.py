from abc import ABC
import redis.asyncio as aioredis


class BaseRedisRepository(ABC):
    """Redis Repository 기본 클래스 - Async"""

    def __init__(self, redis_client: aioredis.Redis, id: str):
        super().__init__()
        self._redis = redis_client
        self._id = id

    async def _set_ttl(self, key: str, ttl: int) -> bool:
        """TTL 설정"""
        return await self._redis.expire(key, ttl)
