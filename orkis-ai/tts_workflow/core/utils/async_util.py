import asyncio
from functools import wraps
from typing import Callable, Coroutine, Any


def fire_and_forget(func: Callable[..., Coroutine[Any, Any, Any]]) -> Callable[..., asyncio.Task]:
    """
    async 함수를 fire-and-forget으로 실행하는 데코레이터

    사용법:
        @fire_and_forget
        async def some_task():
            await do_something()

        # 호출 시 await 없이 사용
        some_task()  # 백그라운드에서 실행, 즉시 반환
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> None:
        return asyncio.create_task(func(*args, **kwargs))
    return wrapper
