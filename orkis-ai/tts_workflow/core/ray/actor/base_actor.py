from abc import ABC

class BaseActor(ABC):
    """모든 Actor의 기본 클래스"""
    def get_pool_stats(self) -> dict:
        """Pool 상태 조회"""
        return {}