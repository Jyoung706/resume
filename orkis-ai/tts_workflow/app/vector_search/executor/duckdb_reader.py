import duckdb
import threading
from typing import Any, List, Optional, Union

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.vector_search.constants import FetchType
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import DBPathEnv
from tts_workflow.core.vector_search.executor.timeout import with_timeout


class DuckDBReader(BaseReader):
    """DuckDB 읽기 전용 Executor"""

    __env_schema__ = DBPathEnv  # db_id + path 필요

    _file_extn: str = "duckdb"
    _conn_timeout: float = 0.5
    _query_timeout: float = 60.0

    def _setup(self) -> None:
        self._conn = None
        self._lock = threading.Lock()

        try:
            self._base_path = self._root_path / self.db_id / self.path / f"{self.db_name}.{self._file_extn}"

            if not self._base_path.exists():
                raise FileNotFoundError(f"Database file not found: {self._base_path}")

            self._conn = duckdb.connect(str(self._base_path), read_only=True)
            exec_logger.debug(f"DuckDBReader connected: {self._base_path}")

        except Exception as e:
            exec_logger.error(f"Failed to connect DuckDB: {e}")
            raise

    def close(self) -> None:
        """연결 종료"""
        if self._conn:
            try:
                try:
                    # 메모리 정리를 위한 명시적 커맨드
                    self._conn.execute("PRAGMA memory_purge")
                except:
                    pass
                
                self._conn.close()
                exec_logger.debug(f"DuckDBReader closed: {self._base_path}")
            except Exception as e:
                exec_logger.warning(f"Error closing DuckDB: {e}")
            finally:
                self._conn = None

    @with_timeout
    def query(
        self,
        sql: str,
        params: Optional[tuple] = None,
        fetch: Union[FetchType, int] = FetchType.ALL
    ) -> List[Any]:
        """
        SQL 쿼리 실행

        Args:
            sql: SQL 쿼리
            params: 쿼리 파라미터
            fetch: FetchType.ALL | FetchType.ONE | int (fetchmany)

        Returns:
            쿼리 결과
        """
        with self._lock:
            if not self._conn:
                raise RuntimeError("Database not connected")

            if params:
                result = self._conn.execute(sql, params)
            else:
                result = self._conn.execute(sql)

            match fetch:
                case FetchType.ALL:
                    return result.fetchall()
                case _:
                    raise ValueError("Invalid fetch argument: FetchType.ALL | FetchType.ONE | int")