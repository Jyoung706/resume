from functools import wraps
import json
import time
from typing import Any, Dict, Literal


from core.static.rag_enum import RAG_TYPE
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.exceptions.base import RedisError
from tts_workflow.core.redis.redis_repository_base import BaseRedisRepository
from tts_workflow.core.static.redis_enum import FIELDS, KEYS, PROC_STAT_CODE, SERVICE_CODE, STATUS_CODE
from tts_workflow.core.static.work_enum import RESULT_CODE
from tts_workflow.core.utils.async_util import fire_and_forget


def prefix(func):
    @wraps(func)
    async def wrapper(self, key=None, *args, **kwargs):
        key = f"{self._id}:{key}" if key else self._id
        return await func(self, key, *args, **kwargs)
    return wrapper


class ChatRedisRepository(BaseRedisRepository):
    
    @fire_and_forget
    async def proc_init_input(self, input: Dict[str, Any]) -> None:
        """process 관리 input 정보 초기화"""
        await self._proc_put(value=input)
        await self._rxadd(key=KEYS.process_stream, value={"i": json.dumps(input)})

    @fire_and_forget
    async def proc_init_step(self, procs: Dict[int, Any]) -> None:
        """process 관리 step 정보 초기화"""
        process_data = list()
        for seq, proc in procs.items():
            process_data.append({seq: proc.process_id})

        await self._proc_put(value=process_data)
        await self._rxadd(key=KEYS.process_stream, value={"s": str(process_data)})

    @fire_and_forget
    async def proc_update(
        self,
        proc_id: int,
        new_status: PROC_STAT_CODE,
        msg_id: str = None
    ) -> None:
        exec_logger.debug(f"Process Update: proc_id={proc_id}, new_status={new_status}, msg_id={msg_id}")

        """특정 순서의 단계 상태 업데이트"""
        data = {FIELDS.id: proc_id, FIELDS.stat: new_status.value}

        if msg_id is not None:
            data[FIELDS.msg_id] = msg_id

        data['timestamp'] = time.time()

        await self._proc_put(value=data)
        await self._rxadd(key=KEYS.process_stream, value=data)

    @fire_and_forget
    async def proc_end(self, rs_code: str = None) -> None:
        if rs_code is None:
            code = RESULT_CODE.ERROR
        else:
            code = rs_code

        await self._rhset(key=KEYS.process, field=str(code), value=json.dumps({"timestamp": time.time()}))
        await self._rxadd(key=KEYS.process_stream, value={"r": code.value})

    @fire_and_forget
    async def stat_start(self):
        return await self._stat_update(STATUS_CODE.start)

    @fire_and_forget
    async def stat_work(self):
        return await self._stat_update(STATUS_CODE.working)

    @fire_and_forget
    async def stat_end(self, end_timestamp) -> int:
        await self._stat_update(STATUS_CODE.end, now=end_timestamp)

    async def _stat_update(self, status: STATUS_CODE, now: int = None):
        if now is None:
            now = int(time.time())
        field = f"{SERVICE_CODE.AI}_{status}"
        return await self._rhset(key=KEYS.status, field=field, value=now)

    async def _proc_put(self, value: Dict[str, Any]) -> None:
        ind = await self._rincr(key=f"{KEYS.counter}")
        await self._rhset(key=KEYS.process, field=str(ind), value=json.dumps(value))

    # preprocessing 용
    @fire_and_forget
    async def preprocess_exist(self, type: RAG_TYPE = None) -> bool:
        return await self._rexists(key=type.value)

    @fire_and_forget
    async def preprocess_start(self, type: int = None) -> bool:
        return await self._rset(key=type.value, value="")

    @fire_and_forget
    async def preprocess_end(self, type: int = None) -> bool:
        return await self._rdelete(key=type.value)

    # redis 실제 쿼리용
    @prefix
    async def _rexists(self, key: str) -> bool:
        try:
            result = await self._redis.exists(key)
            return bool(result)
        except Exception as e:
            exec_logger.error(f"Error Redis Get String Data: {e}")
            return False

    @prefix
    async def _rdelete(self, key: str) -> bool:
        try:
            result = await self._redis.delete(key)
            return result == 1
        except Exception as e:
            exec_logger.error(f"Error Redis Get String Data: {e}")
            return False

    @prefix
    async def _rget(self, key: str) -> str:
        try:
            result = await self._redis.get(key)
            return result if result else None
        except Exception as e:
            exec_logger.error(f"Error Redis Get String Data: {e}")
            return None

    @prefix
    async def _rset(self, key: str, value: str) -> bool:
        try:
            await self._redis.set(key, value)
            return True
        except Exception as e:
            raise RedisError(f"Error Redis Set String Data: {e}") from e

    @prefix
    async def _rincr(self, key: str, amount: int = 1) -> int:
        try:
            return await self._redis.incr(key, amount)
        except Exception as e:
            raise RedisError(f"Error Redis Incr: {e}") from e

    @prefix
    async def _rhget(self, key: str, hash_key: str = None) -> Dict[str, str] | str:
        try:
            if hash_key is None:
                result = await self._redis.hgetall(key)
            else:
                result = await self._redis.hget(key, hash_key)
            return result
        except Exception as e:
            exec_logger.error(f"Error Redis Get Hash Data: {e}")

    @prefix
    async def _rhlen(self, key: str) -> int:
        try:
            return await self._redis.hlen(key)
        except Exception as e:
            exec_logger.error(f"Error Redis Get Hash Data: {e}")

    @prefix
    async def _rhset(
        self, key: str, value: Dict[str, str] | str, field: str = None
    ) -> bool:
        try:
            if field is None:
                await self._redis.hset(key, mapping=value)
            else:
                await self._redis.hset(key, field, value)
            return True
        except Exception as e:
            raise RedisError(f"Error Redis Set Hash Data: {e}") from e

    @prefix
    async def _rlpush(self, key: str, value: str, direction: Literal["r", "l"] = "r"):
        try:
            if direction == "r":
                await self._redis.rpush(key, value)
            else:
                await self._redis.lpush(key, value)
            return True
        except Exception as e:
            exec_logger.error(f"Error Redis Set List Data: {e}")
            return False

    @prefix
    async def _rxadd(self, key: str, value: Dict[str, Any]) -> str:
        try:
            return await self._redis.xadd(key, value)
        except Exception as e:
            raise RedisError(f"Failed to xadd data: key({key}), value({value}) | {e}") from e
