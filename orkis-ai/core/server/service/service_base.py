from core.server.repository.repository_base import BaseRepository
from abc import ABC, abstractmethod


class BaseService(ABC):
    def __init__(self, repository: BaseRepository):
        self.repo = repository
