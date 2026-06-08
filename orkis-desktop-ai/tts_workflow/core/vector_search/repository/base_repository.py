from abc import ABC


class BaseRepository(ABC):
    """
    Stateless Repository Base

    - 인스턴스 변수 없음 (상태 없음)
    - @with_executors 데코레이터로 executor 자동 주입
    - db_id, api_key는 ExecutorContext에서 자동 획득
    """
    pass
