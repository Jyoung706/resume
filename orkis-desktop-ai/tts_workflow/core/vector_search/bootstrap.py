"""
Vector Search 모듈 초기화 (애플리케이션 부트스트랩)

서버 시작 시 호출하여 Repository/Service를 Registry에 등록합니다.
"""



from tts_workflow.app.vector_search.repository.faiss_lsh_data_repository import FaissLSHDataRepository
from tts_workflow.app.vector_search.repository.json_source_repository import JsonSourceRepository
from tts_workflow.app.vector_search.service.faiss_lsh_entity_search_service import FaissLSHEntitySearchService
from tts_workflow.core.vector_search.registry import Registry


def init_registry():
    """
    서버 시작 시 호출 - Service/Repository 등록
    """
    # Repository 등록
    from tts_workflow.app.vector_search.repository.sqlite_source_repository import SqliteSourceRepository
    from tts_workflow.app.vector_search.repository.csv_source_info_repository import CsvSourceInfoRepository
    from tts_workflow.app.vector_search.repository.faiss_schema_repository import FaissSchemaRepository
    from tts_workflow.app.vector_search.repository.faiss_data_repository import FaissDataRepository
    
    Registry.register(SqliteSourceRepository)
    Registry.register(CsvSourceInfoRepository)
    Registry.register(FaissSchemaRepository)
    Registry.register(FaissDataRepository)
    Registry.register(FaissLSHDataRepository)
    Registry.register(JsonSourceRepository)

    # Service 등록
    from tts_workflow.app.vector_search.service.source_search_service import SourceSearchService
    from tts_workflow.app.vector_search.service.faiss_context_search_service import FaissContextSearchService
    from tts_workflow.app.vector_search.service.faiss_entity_search_service import FaissEntitySearchService
    
    from tts_workflow.app.vector_search.service.faiss_preprocess_service import FaissPreprocessService
    
    Registry.register(SourceSearchService)
    Registry.register(FaissContextSearchService)
    Registry.register(FaissEntitySearchService)
    Registry.register(FaissLSHEntitySearchService)
    Registry.register(FaissPreprocessService)
