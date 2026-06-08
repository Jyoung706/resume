"""
Task Manager 패키지.

- BaseTaskManager: 공통 추상 클래스
- ChatTaskManager: 채팅 태스크 관리 (구현 완료)
- PreprocessTaskManager: 전처리 태스크 관리 (향후 취소 기능 추가 시 구현)
"""
from core.task_manager.base import BaseTaskManager, TaskEntry
from core.task_manager.chat import (
    ChatEntry,
    ChatTaskManager,
    chat_task_manager,
)

__all__ = [
    "BaseTaskManager",
    "TaskEntry",
    "ChatEntry",
    "ChatTaskManager",
    "chat_task_manager",
]
