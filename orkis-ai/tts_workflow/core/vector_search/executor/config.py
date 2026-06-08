# tts_workflow/core/vector_search/executor/config.py
"""
ExecutorConfig - Executor 획득용 Descriptor

Repository에서 Executor를 선언할 때 사용하는 디스크립터입니다.
"""

from typing import TYPE_CHECKING, Type, TypeVar

if TYPE_CHECKING:
    from tts_workflow.core.vector_search.executor.base_executor import BaseExecutor

T = TypeVar('T', bound='BaseExecutor')


class ExecutorConfig:
    """
    Repository에서 Executor 선언용 디스크립터

    사용법:
        class FaissSchemaRepository(SchemaVectorDBRepository):
            vec = ExecutorConfig(FaissReader, path="schema_vector_db")

        class FaissDataRepository(DataVectorDBRepository):
            vec = ExecutorConfig(FaissReader, path="data_vector_db")

        class SqliteSourceRepository(SourceDBRepository):
            db = ExecutorConfig(SqliteReader)
    """

    __slots__ = ('executor_cls', 'static_env', '_attr_name')

    def __init__(self, executor_cls: Type[T], **static_env_kwargs) -> None:
        """
        Args:
            executor_cls: Executor 클래스 (FaissReader, SqliteReader 등)
            **static_env_kwargs: 정적 env 설정 (path 등)
        """
        self.executor_cls = executor_cls
        self.static_env = static_env_kwargs
        self._attr_name = None

    def __set_name__(self, owner: type, name: str) -> None:
        self._attr_name = name

    def __get__(self, obj, objtype=None) -> T:
        if obj is None:
            return self

        from tts_workflow.core.vector_search.context import get_executor
        return get_executor(self.executor_cls, **self.static_env)

    def __repr__(self) -> str:
        return f"ExecutorConfig({self.executor_cls.__name__}, {self.static_env})"
