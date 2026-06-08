import duckdb
import threading
from typing import Any, Dict, List, Optional, Tuple


from tts_workflow.core.vector_search.exceptions import VectorDBError, QueryError
from tts_workflow.core.vector_search.executor.base_executor import BaseWriter
from tts_workflow.core.vector_search.executor.env_schema import DBPathEnv
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.vector_search.executor.timeout import with_timeout


class DuckDBWriter(BaseWriter):
    __env_schema__ = DBPathEnv  # db_id + path 필요
    _file_extn: str = "duckdb"
    _conn_timeout: float = 0.5
    _query_timeout: float = 60.0

    def _setup(self) -> None:
        self._lock = threading.Lock()

        try:
            self._base_path = self._root_path / self.db_id / self.path / f"{self.db_name}.{self._file_extn}"
            exec_logger.info(f"Loading {self.__class__.__name__} from {self._base_path}")
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
                exec_logger.debug(f"DuckDB closed: {self._base_path}")
            except Exception as e:
                exec_logger.warning(f"Error closing DuckDB: {e}")
            finally:
                self._conn = None

    def _create(self, ddl_sqls:List[str], index_sqls:Optional[List[str]]=[]) -> bool:
        try:
            self._conn: duckdb.DuckDBPyConnection = duckdb.connect(str(self._base_path))

            for sql in ddl_sqls:
                self.execute(sql)
            
            for sql in index_sqls:
                self.execute(sql)
        except Exception as e:
            exec_logger.error(f"Failed to create Duckdb into {self._base_path}: {str(e)}")
            raise VectorDBError(f"Failed to create to Duckdb: {str(e)}") from e
    

    # --- 트랜잭션 ---
    def begin(self):
        try:
            self._conn.execute("BEGIN")
        except duckdb.Error as e:
            exec_logger.error(f"Failed to begin transaction: {str(e)}")
            raise QueryError(f"Transaction begin failed: {str(e)}") from e

    def commit(self):
        try:
            self._conn.execute("COMMIT")
        except duckdb.Error as e:
            exec_logger.error(f"Failed to commit transaction: {str(e)}")
            raise QueryError(f"Transaction commit failed: {str(e)}") from e

    def rollback(self):
        try:
            self._conn.execute("ROLLBACK")
        except duckdb.Error as e:
            exec_logger.error(f"Failed to rollback transaction: {str(e)}")
            raise QueryError(f"Transaction rollback failed: {str(e)}") from e

    def checkpoint(self):
        try:
            self._conn.execute("CHECKPOINT")
        except duckdb.Error as e:
            exec_logger.error(f"Failed to checkpoint: {str(e)}")
            raise QueryError(f"Checkpoint failed: {str(e)}") from e
    
    # --- query ---
    @with_timeout
    def execute(self, sql:str, params = None, **kwargs):
        try:
            with self._lock:
                if not hasattr(self, '_conn') or not self._conn:
                    raise QueryError("Database connection not initialized")
                    
                self._conn.execute(sql, params or [])

            return {"rowcount": None, "lastrowid": None}
        except QueryError:
            # commit에서 발생한 QueryError는 그대로 전파
            raise
        except duckdb.Error as e:
            exec_logger.error(f"DB execute error: {sql[:100]}... Error: {str(e)}")
            raise QueryError(f"DB execute failed: {str(e)}") from e
        except Exception as e:
            exec_logger.error(f"Unexpected error in execute: {str(e)}")
            raise QueryError(f"Execute failed: {str(e)}") from e
        
    @with_timeout
    def executemany(self, sql, seq_of_params):
        try:
            with self._lock:
                if not hasattr(self, '_conn') or not self._conn:
                    raise QueryError("Database connection not initialized")
                    
                self._conn.executemany(sql, seq_of_params)
            
            return {"rowcount": None, "lastrowid": None}
        except QueryError:
            # commit에서 발생한 QueryError는 그대로 전파
            raise
        except duckdb.Error as e:
            exec_logger.error(f"DB executemany error: {sql[:100]}... Error: {str(e)}")
            raise QueryError(f"DB executemany failed: {str(e)}") from e
        except Exception as e:
            exec_logger.error(f"Unexpected error in executemany: {str(e)}")
            raise QueryError(f"Executemany failed: {str(e)}") from e