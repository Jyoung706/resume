import threading
from typing import Any

from core.application.base_ray_manager import BaseRayManager
from tts_workflow.core.ray.actor_manager import ActorManager, get_conversation_actor
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.conf.ray_config import ray_config


class RayConversationManager(BaseRayManager):
    """
    Conversation Actor Task 관리자

    BaseRayManager의 Queue + Round-robin을 상속하고,
    Conversation 전용 cancel/recreate 기능을 추가합니다.
    """

    def _get_actor(self, index: int):
        return get_conversation_actor(index)

    def _get_max_actors(self) -> int:
        return ray_config.MAX_CONVERSATION_ACTORS

    # ─────────────────────────────────────────────
    # Conversation 전용: Cancel
    # ─────────────────────────────────────────────

    def cancel_task(self, task_id: str) -> bool:
        """Task 취소"""
        cancel_info = None

        with self._lock:
            # 1. 큐에 있으면 제거
            if task_id in self._task_queue:
                del self._task_queue[task_id]
                exec_logger.info(f"[CANCEL] Removed from queue: {task_id}")
                return True

            # 2. 실행 중이면 kill 준비
            for actor_index, running_task_id in self._running.items():
                if running_task_id == task_id:
                    cancel_info = actor_index
                    # Sentinel: 슬롯을 "재생성 중"으로 마킹 (다른 task dispatch 방지)
                    self._running[actor_index] = None
                    break

        if cancel_info is not None:
            actor_index = cancel_info

            # kill (blocking - shutdown은 빠름)
            try:
                result = ActorManager.kill_conversation_actor(actor_index)
                exec_logger.info(f"[CANCEL] Killed Actor[{actor_index}] for {task_id}")
            except Exception as e:
                exec_logger.error(f"[CANCEL] Failed to kill Actor[{actor_index}]: {e}")
                result = {}

            # recreate는 별도 thread에서 (caller는 기다리지 않음)
            threading.Thread(
                target=self._recreate_and_release,
                args=(actor_index, result),
                daemon=True
            ).start()

            return True

        # 3. 둘 다 아니면 이미 완료
        exec_logger.info(f"[CANCEL] Already completed: {task_id}")
        return True

    def _recreate_and_release(self, actor_index: int, finalize_kwargs: dict) -> None:
        """Actor 재생성 후 슬롯 해제 (background thread)"""
        try:
            ActorManager.recreate_conversation_actor(actor_index, finalize_kwargs)
            exec_logger.info(f"[RECREATE] Actor[{actor_index}] recreated")
        except Exception as e:
            exec_logger.error(f"[RECREATE] Failed to recreate Actor[{actor_index}]: {e}")

        # 슬롯 해제
        with self._lock:
            if self._running.get(actor_index) is None:
                del self._running[actor_index]

        self._try_dispatch_next()


# 전역 인스턴스 접근자
def get_ray_conversation_manager() -> RayConversationManager:
    """Thread-safe 전역 인스턴스 획득"""
    return RayConversationManager.get_instance()


# 하위 호환성을 위한 전역 인스턴스
ray_conversation_manager = RayConversationManager.get_instance()
