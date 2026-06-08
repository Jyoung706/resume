import json
from typing import Any, Dict

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.vector_search.constants import ENCODING_TYPE
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import FileEnv


class JsonReader(BaseReader):
    __env_schema__ = FileEnv  # db_id 필요

    _file_extn: str = "json"
    _encoding: str = ENCODING_TYPE.UTF8
    _schema: Dict[str, Any] = None

    def _setup(self) -> None:
        """json 경로 설정 및 로드"""
        self._base_path = self._root_path / self.db_id / f"{self._file_name}.{self._file_extn}"
        exec_logger.debug(f"JsonReader connected: {self._base_path}")
        self._load()

    def _load(self) -> None:
        """JSON 파일 로드 (1회)"""
        with open(self._base_path, "r", encoding=self._encoding) as f:
            self._schema = json.load(f)
        exec_logger.debug(f"JsonReader loaded schema from {self._base_path}")

    def get_schema(self) -> Dict[str, Any]:
        """캐시된 스키마 반환"""
        return self._schema

    def close(self) -> None:
        """리소스 정리"""
        self._base_path = None
        self._schema = None
        exec_logger.debug("JsonReader closed")
    