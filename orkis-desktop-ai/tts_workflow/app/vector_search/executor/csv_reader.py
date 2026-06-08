from pathlib import Path
import pandas as pd

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.vector_search.constants import ENCODING_TYPE
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import DBEnv


class CsvReader(BaseReader):
    """CSV 읽기 전용 Executor - Pool 캐싱 대상"""

    __env_schema__ = DBEnv  # db_id 필요

    _file_extn: str = "csv"
    _path: str = "database_description"
    _encoding: str = ENCODING_TYPE.UTF8_SIG
    
    def _setup(self) -> None:
        """CSV 경로 설정"""
        # path는 ExecutorConfig에서 제공 (없으면 기본값 사용)
        self._base_path = self._root_path / self.db_id / self.path
        exec_logger.debug(f"CsvReader connected: {self._base_path}")

    def close(self) -> None:
        """리소스 정리"""
        self._base_path = None
        exec_logger.debug("CsvReader closed")

    def load(self, table_name: str) -> pd.DataFrame:
        """
        테이블 설명 CSV 로드

        Args:
            table_name: 테이블명 (파일명으로 사용)

        Returns:
            DataFrame
        """
        if not self._base_path:
            raise RuntimeError("CsvReader not connected")

        file_path = self._base_path / f"{table_name}.{self._file_extn}"

        # 기본 인코딩으로 시도
        try:
            return self._read_csv(file_path, self._encoding)
        except UnicodeDecodeError:
            pass

        # fallback 인코딩들로 재시도
        for encoding in [enc.value for enc in ENCODING_TYPE if enc.value != self._encoding]:
            if encoding == self._encoding:
                continue
            try:
                exec_logger.info(f"Retrying with {encoding} encoding...")
                df = self._read_csv(file_path, encoding)
                exec_logger.warning(f"Loaded {file_path} with {encoding} instead of {self._encoding}")
                return df
            except UnicodeDecodeError:
                continue

        raise ValueError(f"Failed to load CSV: {file_path}")

    def _read_csv(self, file_path: Path, encoding: str) -> pd.DataFrame:
        """CSV 파일 읽기"""
        df = pd.read_csv(file_path, index_col=False, encoding=encoding)
        if df.empty:
            raise ValueError(f"Empty CSV file: {file_path}")
        return df
