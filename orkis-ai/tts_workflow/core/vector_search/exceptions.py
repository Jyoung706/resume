class VectorSearchError(Exception):
    """Vector Search 기본 예외 클래스"""
    pass

class RegistryError(VectorSearchError):
    """Registry 관련 예외"""
    pass


class ExecutorError(VectorSearchError):
    """Executor 관련 예외"""
    pass

class RepositoryError(VectorSearchError):
    """Repository 관련 예외"""
    pass

class ServiceError(VectorSearchError):
    """Service 관련 예외"""
    pass

class ConnectionError(ExecutorError):
    """DB 연결 관련 예외"""
    pass

class QueryError(ExecutorError):
    """쿼리 실행 관련 예외"""
    pass

class DataNotFoundError(RepositoryError):
    """데이터를 찾을 수 없을 때 발생하는 예외"""
    pass

class ConfigurationError(VectorSearchError):
    """설정 관련 예외"""
    pass

class PreprocessingError(ServiceError):
    """전처리 과정에서 발생하는 예외"""
    pass

class EmbeddingError(ServiceError):
    """임베딩 생성 관련 예외"""
    pass

class LSHError(RepositoryError):
    """LSH 관련 예외"""
    pass

class VectorDBError(RepositoryError):
    """Vector DB 관련 예외"""
    pass