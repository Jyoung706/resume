"""
ChatTaskManager - 채팅 워크플로우 태스크 레지스트리.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Optional

from core.task_manager.base import BaseTaskManager, TaskEntry


@dataclass
class ChatEntry(TaskEntry):
    """채팅 태스크 엔트리 - session_id 메타데이터 포함."""
    session_id: str = ""


class ChatTaskManager(BaseTaskManager[ChatEntry]):
    """채팅 LangGraph 워크플로우 태스크 관리."""

    def _create_entry(
        self,
        task_id: str,
        task: Optional[asyncio.Task],
        cancel_event: asyncio.Event,
        **metadata,
    ) -> ChatEntry:
        return ChatEntry(
            task_id=task_id,
            task=task,
            cancel_event=cancel_event,
            session_id=metadata.get("session_id", ""),
        )


# 모듈 레벨 싱글톤
chat_task_manager = ChatTaskManager()
