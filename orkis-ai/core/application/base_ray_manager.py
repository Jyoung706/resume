import asyncio
import functools
import threading
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, Optional, Tuple
from collections import OrderedDict
from tts_workflow.app.utils.logger.exec_logger import exec_logger

# execute 전용 sentinel — task_id 문자열/None(cancel)과 충돌 불가
_EXECUTE_SENTINEL = object()


class BaseRayManager(ABC):
    """
    Ray Actor Task 관리 베이스 클래스 (Queue + Round-robin)

    구조:
        _task_queue: 대기 중인 task (OrderedDict: task_id → (invoke, remote_args, remote_kwargs))
        _running: 실행 중인 task (Dict: actor_index → task_id)

    서브클래스는 다음 2개의 abstract 메서드를 구현해야 합니다:
        _get_actor(index): actor handle 획득
        _get_max_actors(): 최대 actor 수

    사용법:
        # fire-and-forget (큐 경유)
        manager.submit_task("task-1", lambda actor: actor.run, task_dict)

        # 직접 실행 + 결과 대기
        result = await manager.execute(lambda actor: actor.validate_db, task_dict)
    """

    _instance: Optional['BaseRayManager'] = None
    _instance_lock = threading.Lock()

    def __init__(self):
        self._task_queue: OrderedDict[str, Tuple[Callable, tuple, dict]] = OrderedDict()
        self._running: Dict[int, Any] = {}  # actor_index → task_id(str) | None(cancel) | _EXECUTE_SENTINEL
        self._last_actor_index: int = 0
        self._lock = threading.Lock()

        exec_logger.info(f"{self.__class__.__name__} initialized (Queue-based)")

    @classmethod
    def get_instance(cls):
        """Thread-safe Singleton 인스턴스 획득"""
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    # ─────────────────────────────────────────────
    # Abstract methods (서브클래스에서 구현)
    # ─────────────────────────────────────────────

    @abstractmethod
    def _get_actor(self, index: int):
        """actor handle 획득"""
        ...

    @abstractmethod
    def _get_max_actors(self) -> int:
        """최대 actor 수 반환"""
        ...

    # ─────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────

    async def execute(
        self,
        invoke: Callable,
        *remote_args,
        timeout: float = 30.0,
        **remote_kwargs,
    ) -> Any:
        """
        Actor에서 직접 실행하고 결과를 반환.

        submit_task(fire-and-forget)와 달리, 결과를 await하여 반환합니다.
        idle actor가 없으면 슬롯이 확보될 때까지 polling 대기합니다.
        _running 슬롯을 점유하여 queue dispatch와의 충돌을 방지합니다.

        Args:
            invoke: actor method selector (예: lambda actor: actor.validate_db)
            *remote_args, **remote_kwargs: invoke로 선택된 메서드의 .remote()에 전달할 인자
            timeout: idle actor 대기 최대 시간 (초). 초과 시 TimeoutError

        Returns:
            Actor 메서드의 실행 결과

        Raises:
            TimeoutError: timeout 내에 idle actor를 확보하지 못한 경우
        """
        actor_index = await self._acquire_idle_actor(timeout=timeout)

        try:
            actor = self._get_actor(actor_index)
            ref = invoke(actor).remote(*remote_args, **remote_kwargs)
            exec_logger.info(f"[EXECUTE] -> Actor[{actor_index}]")
            return await ref
        finally:
            with self._lock:
                if self._running.get(actor_index) is _EXECUTE_SENTINEL:
                    del self._running[actor_index]
            self._try_dispatch_next()

    def submit_task(self, task_id: str, invoke: Callable, *remote_args, **remote_kwargs) -> None:
        """
        Task 제출

        Args:
            task_id: 고유 task ID
            invoke: actor method selector (예: lambda actor: actor.preprocess)
            *remote_args, **remote_kwargs: invoke로 선택된 메서드의 .remote()에 전달할 인자
        """
        with self._lock:
            self._task_queue[task_id] = (invoke, remote_args, remote_kwargs)
            exec_logger.info(f"[SUBMIT] Task queued: {task_id} (queue_size={len(self._task_queue)})")

        self._try_dispatch_next()

    def get_stats(self) -> dict:
        """상태 조회"""
        with self._lock:
            return {
                "queue_size": len(self._task_queue),
                "queued": list(self._task_queue.keys()),
                "running": dict(self._running),
            }

    # ─────────────────────────────────────────────
    # Execute: idle actor 확보
    # ─────────────────────────────────────────────

    async def _acquire_idle_actor(
        self,
        timeout: float = 30.0,
        poll_interval: float = 0.1,
    ) -> int:
        """
        Idle actor를 확보할 때까지 polling 대기.

        _running에 _EXECUTE_SENTINEL로 슬롯을 선점하고 actor index를 반환.
        queue dispatch의 _find_idle_actor()가 이 슬롯을 idle로 판단하지 않음.

        Args:
            timeout: 최대 대기 시간 (초)
            poll_interval: 폴링 간격 (초)

        Returns:
            확보된 actor index

        Raises:
            TimeoutError: timeout 초과
        """
        elapsed = 0.0

        while True:
            with self._lock:
                idx = self._find_idle_actor()
                if idx is not None:
                    self._running[idx] = _EXECUTE_SENTINEL
                    exec_logger.info(f"[EXECUTE] Acquired Actor[{idx}]")
                    return idx

            if elapsed >= timeout:
                raise TimeoutError(
                    f"[EXECUTE] No idle actor available within {timeout}s "
                    f"(running={dict(self._running)})"
                )

            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

    # ─────────────────────────────────────────────
    # Core: 다음 task dispatch 시도
    # ─────────────────────────────────────────────

    def _try_dispatch_next(self) -> None:
        """큐에서 다음 task를 idle actor에 dispatch"""
        dispatch_info = None

        with self._lock:
            if not self._task_queue:
                return

            actor_index = self._find_idle_actor()
            if actor_index is None:
                return

            task_id, task_entry = self._task_queue.popitem(last=False)
            self._running[actor_index] = task_id
            dispatch_info = (actor_index, task_id, task_entry)

        if dispatch_info:
            self._dispatch_task(*dispatch_info)

    # ─────────────────────────────────────────────
    # Internal
    # ─────────────────────────────────────────────

    def _find_idle_actor(self) -> Optional[int]:
        """Round-robin으로 idle actor 찾기 (lock 내부에서 호출)"""
        max_actors = self._get_max_actors()

        for offset in range(max_actors):
            idx = (self._last_actor_index + offset) % max_actors
            if idx not in self._running:
                self._last_actor_index = (idx + 1) % max_actors
                return idx
        return None

    def _dispatch_task(self, actor_index: int, task_id: str, task_entry: Tuple[Callable, tuple, dict]) -> None:
        """Actor에 task 전송 (lock 밖에서 호출)"""
        invoke, remote_args, remote_kwargs = task_entry
        actor = self._get_actor(actor_index)
        ref = invoke(actor).remote(*remote_args, **remote_kwargs)

        ref._on_completed(
            functools.partial(
                self._on_task_completed,
                task_id=task_id,
                actor_index=actor_index
            )
        )
        exec_logger.info(f"[DISPATCH] {task_id} -> Actor[{actor_index}]")

    def _on_task_completed(self, result: Any, *, task_id: str, actor_index: int) -> None:
        """Task 완료 callback (Ray worker 스레드에서 호출)"""
        try:
            with self._lock:
                if self._running.get(actor_index) == task_id:
                    del self._running[actor_index]

            exec_logger.info(f"[COMPLETE] {task_id} on Actor[{actor_index}]")

            self._try_dispatch_next()
        except Exception as e:
            exec_logger.error(f"Error in callback for {task_id}: {e}")
