from abc import ABC, abstractmethod
from threading import Lock
from functools import lru_cache


class TaskRepositoryBase(ABC):
    _instance = None
    _lock = Lock()

    @abstractmethod
    def __init__(self, *args, **kwargs):
        pass

    @abstractmethod
    def generate_task_id(self) -> str:
        pass


@lru_cache()
def get_task_repository() -> TaskRepositoryBase:
    from app.chat.TaskFileCSVRepository import TaskFileCSVRepository

    return TaskFileCSVRepository()
