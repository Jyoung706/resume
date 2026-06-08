"""
Vector Search Core Module

Provides base classes and infrastructure for vector search operations.
"""

from tts_workflow.core.vector_search.constants import (
    ExecutionStatus,
    FetchType,
    ENCODING_TYPE,
    INDEX_TYPE,
)
from tts_workflow.core.vector_search.exceptions import (
    VectorSearchError,
    RegistryError,
    ExecutorError,
    RepositoryError,
    ServiceError,
    ConnectionError,
    QueryError,
    DataNotFoundError,
    ConfigurationError,
    PreprocessingError,
    EmbeddingError,
    LSHError,
    VectorDBError,
)

__all__ = [
    # Constants
    "ExecutionStatus",
    "FetchType",
    "ENCODING_TYPE",
    "INDEX_TYPE",
    # Exceptions
    "VectorSearchError",
    "RegistryError",
    "ExecutorError",
    "RepositoryError",
    "ServiceError",
    "ConnectionError",
    "QueryError",
    "DataNotFoundError",
    "ConfigurationError",
    "PreprocessingError",
    "EmbeddingError",
    "LSHError",
    "VectorDBError",
]
