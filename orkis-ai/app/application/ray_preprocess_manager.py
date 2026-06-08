from core.application.base_ray_manager import BaseRayManager
from tts_workflow.core.ray.actor_manager import get_preprocess_actor
from tts_workflow.core.conf.ray_config import ray_config


class RayPreprocessManager(BaseRayManager):
    """
    Preprocess Actor Task 관리자

    BaseRayManager의 Queue + Round-robin을 상속합니다.
    cancel 기능은 없습니다 (전처리는 멱등/재시작 가능).
    """

    def _get_actor(self, index: int):
        return get_preprocess_actor(index)

    def _get_max_actors(self) -> int:
        return ray_config.MAX_PREPROCESS_ACTORS


# 전역 인스턴스 접근자
def get_ray_preprocess_manager() -> RayPreprocessManager:
    """Thread-safe 전역 인스턴스 획득"""
    return RayPreprocessManager.get_instance()


# 하위 호환성을 위한 전역 인스턴스
ray_preprocess_manager = RayPreprocessManager.get_instance()
