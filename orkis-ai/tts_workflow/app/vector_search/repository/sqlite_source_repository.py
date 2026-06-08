from typing import Any, Dict, List, Tuple

from func_timeout import FunctionTimedOut

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.executor.sqlite_reader import SqliteReader
from tts_workflow.core.database.utils.schema import ColumnDB
from tts_workflow.core.vector_search.constants import FetchType
from tts_workflow.core.vector_search.executor.config import ExecutorConfig
from tts_workflow.core.vector_search.repository.source_db_repository import SourceDBRepository
from tts_workflow.core.vector_search.sql.sqlite_sql import SQL


class SqliteSourceRepository(SourceDBRepository):
    """SQLite 기반 SourceDB 구현체 - Stateless"""

    db = ExecutorConfig(SqliteReader)

    def get_db_schema(self) -> Dict[str, List[str]]:
        try:
            table_names = self._get_all_tables()
            return {
                table_name.replace('"', "").replace("`", ""): self._get_columns_name(table_name)
                for table_name in table_names
            }
        except Exception as e:
            exec_logger.error(f"Error in get_db_schema: {e}")
            raise

    def get_all_tables(self) -> List[str]:
        return self._get_all_tables()

    def get_table_columns(self, table_name: str) -> List[ColumnDB]:
        rows = self.db.query(SQL.TABLE_INFO.format(table_name=table_name))
        return [
            ColumnDB(
                cid=row[0],
                name=row[1],
                type=row[2] if row[2] else None,
                notnull=bool(row[3]),
                dflt_value=row[4] if row[4] else None,
                pk=row[5]
            )
            for row in rows
        ]

    def get_table_columns_name(self, table_name: str) -> List[str]:
        return self._get_columns_name(table_name)

    def get_table_primarykeys(self, table_name: str) -> List[str]:
        rows = self.db.query(SQL.TABLE_INFO.format(table_name=table_name))
        primary_keys = []
        for column in rows:
            if column[5] > 0:
                column_name = column[1]
                if column_name.lower() not in [c.lower() for c in primary_keys]:
                    primary_keys.append(column_name)
        return primary_keys

    def get_table_foreignkeys(self, table_name: str) -> List[Tuple]:
        return self.db.query(SQL.FOREIGN_KEY_LIST.format(table_name=table_name))

    def get_unique_info(self, table_name: str, column_name: str) -> Tuple[int, int]:
        result = self.db.query(
            SQL.UNIQUE_INFO.format(table_name=table_name, column_name=column_name),
            fetch=FetchType.ONE
        )
        sum_of_lengths, count_distinct = result if result else (0, 0)
        return sum_of_lengths or 0, count_distinct or 0

    def get_unique_values(self, table_name: str, column_name: str) -> List[str]:
        rs = self.db.query(SQL.DISTINCT_VALUES.format(table_name=table_name, column_name=column_name))
        return [str(col[0]) for col in rs]

    def get_unique_cnt(self, table_name: str, column_name: str, limit: int = 21) -> int:
        rs = self.db.query(
            SQL.DISTINCT_COUNT_LIMIT.format(table_name=table_name, column_name=column_name, limit=limit),
            fetch=FetchType.ONE
        )
        return int(rs[0]) if rs else 0

    def get_value_cnt(self, table_name: str) -> int:
        rs = self.db.query(SQL.COUNT_ROWS.format(table_name=table_name), fetch=FetchType.ONE)
        return int(rs[0]) if rs else 0

    def get_statics_info(self, table_name: str, column_name: str, limit: int = 21) -> Any:
        rs = self.db.query(
            SQL.STATISTICS_INFO.format(table_name=table_name, column_name=column_name),
            fetch=FetchType.ONE
        )
        return rs[0] if rs else None

    def get_column_example(self, table_name: str, column_name: str, limit: int = 3) -> List[Any]:
        return self.db.query(
            SQL.DISTINCT_VALUES_LIMIT.format(table_name=table_name, column_name=column_name, limit=limit)
        )

    def get_ddl_by_table(self, table_name: str) -> Any:
        rs = self.db.query(SQL.DDL_BY_TABLE.format(table_name=table_name), fetch=FetchType.ONE)
        return rs

    def execute_query(self, sql: str) -> List[Any]:
        try:
            return self.db.query(sql)
        except FunctionTimedOut:
            return []
        except Exception as e:
            return str(e)

    # Private helper methods
    def _get_all_tables(self) -> List[str]:
        rs = self.db.query(SQL.ALL_TABLES)
        return [table[0] for table in rs if table[0] != "sqlite_sequence"]

    def _get_columns_name(self, table_name: str) -> List[str]:
        rs = self.db.query(SQL.TABLE_INFO.format(table_name=table_name))
        return [row[1].replace('"', "").replace("`", "") for row in rs]
