from pathlib import Path
import json
import hashlib
from typing import Any, Dict
from concurrent.futures import ThreadPoolExecutor
import asyncio

from tts_workflow.core.ray.actor.base_actor import BaseActor
from tts_workflow.core.ray.base_actor_pool import LRUTTLPool

from tts_workflow.app.utils.logger.exec_logger import exec_logger


class ResourceActor(BaseActor):
    """
    리소스 관리 Actor
    """

    def __init__(
        self,
        max_pool_size: int = 5,
        ttl_seconds: float = 1800.0,  # 30분
        max_workers: int = 4,
        **kwargs
    ):
        self._pool: LRUTTLPool = LRUTTLPool(
            max_size=max_pool_size,
            ttl_seconds=ttl_seconds,
            name=self.name
        )
        self._executor = ThreadPoolExecutor(max_workers=max_workers)

        exec_logger.info(f"{self.name} initialized:  max_pool={max_pool_size}")
    
    @property
    def name(self) -> str:
        return self._name

    def _make_key(self, **kwargs) -> str:
        canonical = json.dumps(kwargs, sort_keys=True)
        return hashlib.sha256(canonical.encode()).hexdigest()[:16]
    
    async def run_on_thread(self, method_name:str, **kwargs) -> str:
        import functools
        func = getattr(self, method_name)
        
        """Index를 Pool에 등록 (async)"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._executor,
            functools.partial(func, **kwargs)
        )
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Pool 상태 조회"""
        return self._pool.get_stats()

    def clear(self) -> None:
        """Pool 초기화"""
        self._pool.clear()
        
        if hasattr(self, '_executor'):
            self._executor.shutdown(wait=False)

        exec_logger.info(f"{self.name}: Pool cleared")
