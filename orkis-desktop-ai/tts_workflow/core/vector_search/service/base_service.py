# tts_workflow/core/vector_search/service/base_service.py
"""
Service Base Class
"""

from typing import TypeVar

T = TypeVar('T', bound='BaseService')


class BaseService:
    """
    Stateless Service Base

    사용법:
        1. Worker에서 Descriptor로:
            class MyWorker(Work):
                src_search: SourceSearchService

                def _run(self, state):
                    self.src_search.do_something()

        2. Context manager로:
            with FaissPreprocessService() as svc:
                svc.do_something()
    """

    def __enter__(self: T) -> T:
        from tts_workflow.core.vector_search.registry import Registry
        return Registry.get(self.__class__)

    def __exit__(self, exc_type, exc_val, exc_tb):
        return False

    def __set_name__(self, owner, name):
        self._attr_name = name

    def __get__(self: T, obj, objtype=None) -> T:
        if obj is None:
            return self

        from tts_workflow.core.vector_search.registry import Registry
        return Registry.get(self.__class__)
