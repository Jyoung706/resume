import time
import threading
from collections import OrderedDict
from typing import Dict, Optional, Callable, Any
from dataclasses import dataclass
from tts_workflow.app.utils.logger.exec_logger import exec_logger


@dataclass
class PoolEntry():
    """Pool 항목"""
    value: Any
    created_at: float
    last_used_at: float


class LRUTTLPool():
    """
    LRU + TTL 기반 Pool (Thread-Safe)

    - max_size 초과 시 가장 오래 사용 안한 항목 삭제 (LRU)
    - ttl_seconds 경과 시 자동 만료 (TTL)
    - threading.Lock으로 thread-safe 보장
    """

    def __init__(
        self,
        max_size: int = 5,
        ttl_seconds: float = 1800.0,
        name: str = "LRUTTLPool"
    ):
        self._pool: OrderedDict[str, PoolEntry] = OrderedDict()
        self._max_size = max_size
        self._ttl_seconds = ttl_seconds
        self._name = name
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        """
        항목 조회 (LRU 업데이트)

        Returns:
            항목이 있고 TTL 유효하면 값, 아니면 None
        """
        with self._lock:
            self._cleanup_expired()

            if key not in self._pool:
                return None

            entry = self._pool[key]
            now = time.time()

            if now - entry.created_at > self._ttl_seconds:
                del self._pool[key]
                exec_logger.debug(f"{self._name}: TTL expired for {key}")
                return None

            entry.last_used_at = now
            self._pool.move_to_end(key)

            return entry.value

    def put(
        self,
        key: str,
        value: Any,
        factory: Callable[[], Any] = None
    ) -> Any:
        """
        항목 추가 또는 업데이트

        Args:
            key: 캐시 키
            value: 저장할 값 (None이면 factory 호출)
            factory: value가 None일 때 값 생성 함수

        Returns:
            저장된 값
        """
        with self._lock:
            existing = self._get_unlocked(key)
            if existing is not None:
                return existing

            if len(self._pool) >= self._max_size:
                self._evict_oldest()

        # Lock 해제 후 factory 실행 (오래 걸릴 수 있음)
        actual_value = value if value is not None else (factory() if factory else None)

        if actual_value is None:
            raise ValueError(f"{self._name}: Cannot add None value for key {key}")

        with self._lock:
            # 다시 확인 (다른 스레드가 먼저 넣었을 수 있음)
            if key in self._pool:
                return self._pool[key].value

            self._pool[key] = PoolEntry(
                value=actual_value,
                created_at=time.time(),
                last_used_at=time.time()
            )
            exec_logger.info(f"{self._name}: Added {key} (pool size: {len(self._pool)}/{self._max_size})")

            return actual_value

    def _get_unlocked(self, key: str) -> Optional[Any]:
        """Lock 없이 get (내부용, 이미 Lock 잡은 상태에서 호출)"""
        self._cleanup_expired()

        if key not in self._pool:
            return None

        entry = self._pool[key]
        now = time.time()

        if now - entry.created_at > self._ttl_seconds:
            del self._pool[key]
            return None

        entry.last_used_at = now
        self._pool.move_to_end(key)

        return entry.value

    def get_or_create(self, key: str, factory: Callable[[], Any]) -> Any:
        """
        항목 조회, 없으면 생성

        Args:
            key: 캐시 키
            factory: 항목 생성 함수

        Returns:
            기존 또는 새로 생성된 값
        """
        return self.put(key, None, factory)

    def remove(self, key: str) -> bool:
        """항목 삭제"""
        with self._lock:
            if key in self._pool:
                del self._pool[key]
                exec_logger.debug(f"{self._name}: Removed {key}")
                return True
            return False

    def _evict_oldest(self) -> None:
        """가장 오래 사용 안한 항목 삭제 (Lock 잡은 상태에서 호출)"""
        if not self._pool:
            return
        oldest_key, _ = next(iter(self._pool.items()))
        del self._pool[oldest_key]
        exec_logger.info(f"{self._name}: Evicted LRU {oldest_key}")

    def _cleanup_expired(self) -> None:
        """TTL 만료 항목 정리 (Lock 잡은 상태에서 호출)"""
        now = time.time()
        expired_keys = [
            key for key, entry in self._pool.items()
            if now - entry.created_at > self._ttl_seconds
        ]
        for key in expired_keys:
            del self._pool[key]
            exec_logger.debug(f"{self._name}: Cleaned up expired {key}")

    def clear(self) -> None:
        """전체 정리"""
        with self._lock:
            self._pool.clear()
            exec_logger.info(f"{self._name}: Cleared all entries")

    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        with self._lock:
            self._cleanup_expired()
            return {
                "size": len(self._pool),
                "max_size": self._max_size,
                "ttl_seconds": self._ttl_seconds,
                "keys": list(self._pool.keys()),
            }
