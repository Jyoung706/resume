from typing import Any, Dict

from tts_workflow.core.exceptions.base import RedisError
from tts_workflow.core.redis.redis_repository_base import BaseRedisRepository
from tts_workflow.core.static.redis_enum import FIELDS, KEYS, STREAMING
from tts_workflow.core.utils.async_util import fire_and_forget


class StreamRedisRepository(BaseRedisRepository):
    @fire_and_forget
    async def stream_start(self) -> str:
        self.msg_id = await self._create_msg_id()
        await self._rxadd(value={FIELDS.msg_chunk: ""})
        await self._rset(value=STREAMING.running)
        return self.msg_id

    @fire_and_forget
    async def streaming(self, token: str) -> bool:
        await self._rxadd(value={FIELDS.msg_chunk: token})
        return True

    @fire_and_forget
    async def stream_end(self) -> bool:
        await self._rset(value=STREAMING.end)
        return True

    async def _create_msg_id(self) -> str:
        try:
            ind = await self._redis.incr(f"{self._id}:{KEYS.counter}")
            return f"{self._id}:{ind}"
        except Exception as e:
            raise RedisError(f"Failed to create msg id: {e}") from e

    async def _rset(self, value: str, key: str = None) -> bool:
        try:
            if key is None:
                key = f"{self.msg_id}:{KEYS.streaming_end}"
            await self._redis.set(key, value)
        except Exception as e:
            raise RedisError(f"Error Redis Set String Data: {e}") from e

    async def _rxadd(self, value: Dict[str, Any], key: str = None) -> str:
        try:
            if key is None:
                key = self.msg_id
            return await self._redis.xadd(key, value)
        except Exception as e:
            raise RedisError(f"Failed to xadd data: key({key}), value({value}) | {e}") from e
