# tts_workflow/core/vector_search/executor/timeout.py
"""
Query/Execute timeout 데코레이터

Thread 기반 timeout 처리로 SQLite _conn.interrupt() 지원
"""

import threading
from functools import wraps
from typing import Callable, TypeVar

F = TypeVar("F", bound=Callable)


def with_timeout(func: F) -> F:
    """
    Query/Execute timeout 데코레이터

    사용법:
        class SqliteReader:
            _query_timeout: float = 60.0

            @with_timeout
            def query(self, sql, params, fetch): ...

    동작:
        - 별도 Thread에서 func 실행
        - timeout 초과 시 self._conn.interrupt() 호출
        - TimeoutError 발생
    """

    @wraps(func)
    def wrapper(self, *args, timeout: float = None, **kwargs):
        timeout = timeout or getattr(self, "_query_timeout", 60.0)
        result = {"value": None, "error": None}

        def worker():
            try:
                result["value"] = func(self, *args, **kwargs)
            except Exception as e:
                result["error"] = e

        t = threading.Thread(target=worker)
        t.start()
        t.join(timeout)

        if t.is_alive():
            # SQLite VM 중단
            if hasattr(self, "_conn") and self._conn:
                self._conn.interrupt()
            t.join()
            raise TimeoutError(f"Query exceeded {timeout}s")

        if result["error"]:
            raise result["error"]

        return result["value"]

    return wrapper  # type: ignore
