"""
BaseTaskManager - 비동기 태스크 레지스트리 공통 로직.

submit / cancel / add_done_callback의 공통 패턴을 추상화.
도메인별 구현은 _create_entry()를 오버라이드해 엔트리 타입을 특화.
"""
from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Awaitable, Callable, Dict, Generic, List, Optional, TypeVar


@dataclass
class TaskEntry:
    """모든 태스크 엔트리의 공통 필드.

    task: 실행 중 태스크 객체. pre-cancel로 등록된 경우 None.
    cancel_event: 협력적 취소 플래그.
    started_at: 등록 시각.
    """
    task_id: str
    task: Optional[asyncio.Task]
    cancel_event: asyncio.Event
    started_at: datetime = field(default_factory=datetime.now)


E = TypeVar("E", bound=TaskEntry)


class BaseTaskManager(ABC, Generic[E]):
    """비동기 태스크 중앙 관리 추상 클래스.

    - submit(): 태스크 등록 + 백그라운드 실행 + 완료 시 자동 정리
    - cancel(): 협력적 취소 (cancel_event.set) 또는 pre-cancel 등록
    - get(), list_active(): 상태 조회

    서브클래스에서 _create_entry()를 구현해 도메인 메타데이터를 엔트리에 담는다.
    """

    def __init__(self) -> None:
        self._entries: Dict[str, E] = {}
        self._lock = asyncio.Lock()

    @abstractmethod
    def _create_entry(
        self,
        task_id: str,
        task: Optional[asyncio.Task],
        cancel_event: asyncio.Event,
        **metadata,
    ) -> E:
        """도메인별 엔트리 생성 - 서브클래스에서 반드시 구현.

        metadata: submit()/cancel()에서 전달된 kwargs.
                  서브클래스는 필요한 키만 꺼내 엔트리에 담는다.
        """

    async def submit(
        self,
        task_id: str,
        coro_factory: Callable[[asyncio.Event], Awaitable[None]],
        **metadata,
    ) -> E:
        """태스크 등록 + 실행.

        coro_factory: cancel_event를 받아 코루틴을 반환하는 함수.
        metadata: 서브클래스의 _create_entry()로 전달될 추가 필드.

        pre-cancel로 등록된 엔트리가 있으면 그 cancel_event를 재사용
        (이미 set된 상태이므로 핸들러가 시작 즉시 취소 분기로 진입).
        """
        async with self._lock:
            existing = self._entries.get(task_id)
            if existing is not None and existing.task is None:
                # pre-cancel 엔트리 - cancel_event는 이미 set됨
                cancel_event = existing.cancel_event
            else:
                cancel_event = asyncio.Event()

            task = asyncio.create_task(coro_factory(cancel_event))
            entry = self._create_entry(
                task_id=task_id,
                task=task,
                cancel_event=cancel_event,
                **metadata,
            )
            self._entries[task_id] = entry

        # 락 밖에서 콜백 등록 - 완료 시 엔트리 자동 제거
        task.add_done_callback(lambda _t: self._entries.pop(task_id, None))
        return entry

    async def cancel(self, task_id: str) -> bool:
        """활성 태스크 취소 또는 pre-cancel 등록.

        True:  활성 태스크가 있어서 cancel_event.set() 수행
        False: 활성 태스크 없음 - pre-cancel placeholder 엔트리 등록
        """
        async with self._lock:
            entry = self._entries.get(task_id)
            if entry is not None:
                entry.cancel_event.set()
                return True

            # chat:start 이전에 cancel 도착 -> pre-register
            cancel_event = asyncio.Event()
            cancel_event.set()
            self._entries[task_id] = self._create_entry(
                task_id=task_id,
                task=None,
                cancel_event=cancel_event,
            )
            return False

    def get(self, task_id: str) -> Optional[E]:
        return self._entries.get(task_id)

    def list_active(self) -> List[E]:
        """실제 실행 중인 태스크만 반환 (pre-cancel placeholder 제외)."""
        return [e for e in self._entries.values() if e.task is not None]
