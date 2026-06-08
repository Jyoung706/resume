from pathlib import Path
import sqlite3
import threading
import random
from typing import Any, List, Optional, Union

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.vector_search.constants import FetchType
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import DBEnv
from tts_workflow.core.vector_search.executor.timeout import with_timeout


class SqliteReader(BaseReader):
    """SQLite 읽기 전용 Executor"""

    __env_schema__ = DBEnv  # db_id만 필요

    _file_extn: str = "sqlite"
    _conn_timeout: float = 0.5
    _query_timeout: float = 60.0

    def _setup(self) -> None:
        """SQLite 연결 설정"""
        self._conn = None
        self._lock = threading.Lock()

        try:

            db_name = Path(self._db_id).name # 임시
            
            self._base_path = self._root_path / self.db_id / f"{db_name}.{self._file_extn}"

            if not self._base_path.exists():
                raise FileNotFoundError(f"Database file not found: {self._base_path}")

            self._conn = sqlite3.connect(
                str(self._base_path),
                timeout=self._conn_timeout,
                check_same_thread=False
            )
            exec_logger.debug(f"SqliteReader connected: {self._base_path}")

        except Exception as e:
            exec_logger.error(f"Failed to connect SQLite: {e}")
            raise

    def close(self) -> None:
        """연결 종료"""
        if self._conn:
            try:
                self._conn.close()
                exec_logger.debug(f"SqliteReader closed: {self._base_path}")
            except Exception as e:
                exec_logger.warning(f"Error closing SQLite: {e}")
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
            timeout: 쿼리 timeout (데코레이터에서 처리)

        Returns:
            쿼리 결과
        """
        with self._lock:
            if not self._conn:
                raise RuntimeError("Database not connected")

            cur = self._conn.execute(sql, params or ())

            match fetch:
                case FetchType.ALL:
                    return cur.fetchall()
                case FetchType.ONE:
                    return cur.fetchone()
                case FetchType.RANDOM:
                    samples = cur.fetchmany(10)
                    return random.choice(samples) if samples else None
                case isinstance(fetch, int):
                    return cur.fetchmany(fetch)
                case _:
                    raise ValueError("Invalid fetch argument: 'all' | 'one' | 'random' | int")
                
    @classmethod
    def validate_connection(cls, db_id: str, root_path: Path = None) -> Path:
        import sqlite3

        root = root_path if root_path is not None else cls._root_path
        db_name = Path(db_id).name
        db_path = root / db_id / f"{db_name}.{cls._file_extn}"
        
        if not db_path.exists():
            return False

        try:
            conn = sqlite3.connect(str(db_path), timeout=1.0)
            conn.execute("SELECT 1")
            conn.close()
            return True
        except:
            return False 