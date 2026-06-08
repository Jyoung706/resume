from typing import Any, Dict, List, Tuple, TYPE_CHECKING

from func_timeout import FunctionTimedOut

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.executor.json_reader import JsonReader
from tts_workflow.app.vector_search.executor.json_writer import JsonWriter
from tts_workflow.app.vector_search.executor.sqlite_reader import SqliteReader
from tts_workflow.core.vector_search.executor.config import ExecutorConfig
from tts_workflow.core.vector_search.repository.source_db_repository import SourceDBRepository

if TYPE_CHECKING:
    from tts_workflow.core.database.utils.schema import ColumnDB


class JsonSourceRepository(SourceDBRepository):
    """Json 기반 SourceDB 구현체 - 캐시된 스키마에서 조회"""

    schema_writer = ExecutorConfig(JsonWriter, file_name="schema")
    schema_reader = ExecutorConfig(JsonReader, file_name="schema")
    db = ExecutorConfig(SqliteReader)  # SQL 실행용

    # === Write ===
    def create(self, data: Dict[str, Any]) -> None:
        exec_logger.info("JsonSourceRepository.create called")
        self.schema_writer.create(data)

    # === Schema 조회 ===
    def _get_schema(self) -> Dict[str, Any]:
        """캐시된 스키마 반환"""
        return self.schema_reader.get_schema()

    def _get_table_schema(self, table_name: str) -> Dict[str, Any]:
        """테이블 스키마 반환"""
        schema = self._get_schema()
        return schema.get(table_name, {})

    def _get_column_schema(self, table_name: str, column_name: str) -> Dict[str, Any]:
        """컬럼 스키마 반환"""
        table_schema = self._get_table_schema(table_name)
        return table_schema.get(column_name, {})

    def _get_metadata(self, table_name: str) -> Dict[str, Any]:
        """테이블 메타데이터 반환"""
        table_schema = self._get_table_schema(table_name)
        return table_schema.get("__metadata__", {})

    # === SourceDBRepository 구현 ===
    def get_db_schema(self) -> Dict[str, List[str]]:
        schema = self._get_schema()
        return {
            table_name: [col for col in table_data.keys() if col != "__metadata__"]
            for table_name, table_data in schema.items()
        }

    def get_all_tables(self) -> List[str]:
        return list(self._get_schema().keys())

    def get_table_columns(self, table_name: str) -> List["ColumnDB"]:
        from tts_workflow.core.database.utils.schema import ColumnDB

        table_schema = self._get_table_schema(table_name)
        columns = []
        for col_name, col_data in table_schema.items():
            if col_name == "__metadata__":
                continue
            columns.append(ColumnDB(
                cid=col_data.get("id", 0),
                name=col_name,
                type=col_data.get("type"),
                notnull=col_data.get("notnull", False),
                dflt_value=col_data.get("dflt_value"),
                pk=col_data.get("pk", 0)
            ))
        return columns

    def get_table_columns_name(self, table_name: str) -> List[str]:
        table_schema = self._get_table_schema(table_name)
        return [col for col in table_schema.keys() if col != "__metadata__"]

    def get_table_primarykeys(self, table_name: str) -> List[str]:
        metadata = self._get_metadata(table_name)
        return metadata.get("primary_keys", [])

    def get_table_foreignkeys(self, table_name: str) -> List[Tuple]:
        metadata = self._get_metadata(table_name)
        return metadata.get("foreign_keys", [])

    def get_unique_values(self, table_name: str, column_name: str) -> List[str]:
        col_schema = self._get_column_schema(table_name, column_name)
        return col_schema.get("unique_values", [])

    def get_unique_cnt(self, table_name: str, column_name: str, limit: int = 21) -> int:
        col_schema = self._get_column_schema(table_name, column_name)
        return col_schema.get("unique_cnt", 0)

    def get_value_cnt(self, table_name: str) -> int:
        metadata = self._get_metadata(table_name)
        return metadata.get("value_cnt", 0)

    def get_statics_info(self, table_name: str, column_name: str, limit: int = 21) -> Any:
        col_schema = self._get_column_schema(table_name, column_name)
        return col_schema.get("statics_info")

    def get_column_example(self, table_name: str, column_name: str, limit: int = 3) -> List[Any]:
        col_schema = self._get_column_schema(table_name, column_name)
        examples = col_schema.get("column_example", [])
        return [(ex,) for ex in examples[:limit]]  # SqliteSourceRepository와 동일한 형식

    def get_ddl_by_table(self, table_name: str) -> Any:
        metadata = self._get_metadata(table_name)
        ddl = metadata.get("ddl", [])
        return ddl if ddl else None

    def execute_query(self, sql: str) -> List[Any]:
        """SQL 실행 (SqliteReader 사용)"""
        try:
            return self.db.query(sql)
        except FunctionTimedOut:
            return []
        except Exception as e:
            return str(e)