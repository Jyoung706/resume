from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.service.source_search_service import SourceSearchService
from tts_workflow.core.database.utils.schema_generator import DatabaseSchemaGenerator
from tts_workflow.core.vector_search.registry import Registry
from tts_workflow.core.worker.dataclass.sql_meta_info import SQLMetaInfo
from tts_workflow.core.worker.dataclass.task import ConversationTask
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, PrivateAttr


class SystemState(BaseModel):

    # input values
    task: ConversationTask

    # session history
    chat_history: str = ""

    # updates from intent_classifier (query rewrite)
    rewritten_question: Optional[str] = None

    # updates from intent_classifier
    requires_db_retrieval: Optional[bool] = None

    # updates from extract_keywords
    keywords: List[str] = []

    # updates from retrieve_entity
    similar_columns: Dict[str, List[str]] = {}
    schema_with_examples: Dict[str, Dict[str, List[str]]] = {}

    # updates from retrieve_context
    schema_with_descriptions: Dict[str, Dict[str, Dict[str, str]]] = {}

    # updates from generate_candidate, revise
    SQL_meta_infos: Dict[str, List[SQLMetaInfo]] = {}

    # updates from generate_unit_test
    unit_tests: Dict[str, List[str]] = {}

    # updates from evaluate
    evaluation_result: Dict[str, Any] = None

    # updates from general_llm
    general_answer: str = None

    # update from final
    final_answer: str = None

    errors: Dict[str, str] = {}

    # updates from all nodes calling llm
    # chat_history: Annotated[List[Chat], add_reducer_for_list]  = []

    chat_summary: str = None

    # execution_history: Annotated[List[Any], add_reducer_for_list]  = []

    # Private: Registry에서 가져온 Service (Pydantic 필드 아님)
    _src_search: SourceSearchService = PrivateAttr(default=None)
    
    # schema_generator: 요청별 상태 (per-request state)
    _schema_generator: DatabaseSchemaGenerator = None

    # updates from filter_column, select_columns, select_tables
    tentative_schema: Optional[Dict[str, List[str]]] = None

    __messages__: List[Any] = []
    
    def __init__(self, **data):
        super().__init__(**data)
        self._src_search = Registry.get(SourceSearchService)
        # general 질문은 schema 캐시가 없어도 진행 가능해야 하므로 캐시 부재 시 None 으로 유지.
        # SQL 분기 노드는 tentative_schema 를 직접 사용하지만, 그 진입 전에
        # ConversationActor._is_preprocess_completed 가 막아주므로 추가 보호 불필요.
        if self.tentative_schema is None:
            try:
                self.tentative_schema = self._src_search.get_tentative_schema()
            except FileNotFoundError:
                exec_logger.debug(
                    "tentative_schema deferred: schema cache not available yet"
                )

    @property
    def schema_generator(self) -> DatabaseSchemaGenerator:
        """Lazy loading - ExecutorContext 설정 후 첫 접근 시 초기화"""
        if self._schema_generator is None:
            self._schema_generator = DatabaseSchemaGenerator(
                cached_db_schema=self._src_search.get_cached_db_schema(),
                all_column_examples=self._src_search.get_all_column_example()
            )
        return self._schema_generator
    
    @schema_generator.setter
    def schema_generator(self, value: DatabaseSchemaGenerator) -> None:
        self._schema_generator = value

    class Config:
        # Pydantic이 DatabaseSchemaGenerator 타입 허용
        arbitrary_types_allowed = True

    def get_schema_string(
        self, schema_type: str = "tentative", include_value_description: bool = True
    ) -> str:
        if schema_type == "tentative":
            schema = self.tentative_schema
        elif schema_type == "complete":
            schema = self._src_search.get_tentative_schema()
        else:
            raise ValueError(f"Unknown schema type: {schema_type}")

        return self._src_search.get_database_schema_string(
            self.schema_generator,
            schema,
            self.schema_with_examples,
            self.schema_with_descriptions,
            include_value_description=include_value_description,
        )

    def get_database_schema_for_queries(
        self, queries: List[str], include_value_description: bool = True
    ) -> str:
        schema_dict_list = []
        for query in queries:
            try:
                schema_dict_list.append(
                    self._src_search.get_sql_columns_dict(query)
                )
            except Exception as e:
                exec_logger.error(f"Error in getting database schema for query: {e}")
                schema_dict_list.append({})
        union_schema_dict = self._src_search.get_union_schema_dict(schema_dict_list)
        database_info = self._src_search.get_database_schema_string(
            self.schema_generator,
            union_schema_dict,
            self.schema_with_examples,
            self.schema_with_descriptions,
            include_value_description=include_value_description,
        )
        return database_info

    @staticmethod
    def add_columns_to_tentative_schema(
        tentative_schema: Dict[str, List[str]], selected_columns: Dict[str, List[str]]
    ) -> Dict[str, List[str]]:
        for table_name, columns in selected_columns.items():
            target_table_name = next(
                (t for t in tentative_schema.keys() if t.lower() == table_name.lower()),
                None,
            )
            if target_table_name:
                for column in columns:
                    if column.lower() not in [
                        c.lower() for c in tentative_schema[target_table_name]
                    ]:
                        tentative_schema[target_table_name].append(column)
            else:
                tentative_schema[table_name] = columns
        return tentative_schema

    def add_connections_to_tentative_schema(
        self, tentative_schema: Dict[str, List[str]],
    ) -> Dict[str, List[str]]:
        return self._src_search.add_connections_to_tentative_schema(
            self.schema_generator, tentative_schema
        )
