

import json
from typing import Any, List, Dict


from tts_workflow.core.vector_search.constants import ENCODING_TYPE
from tts_workflow.core.vector_search.executor.base_executor import BaseWriter
from tts_workflow.core.vector_search.executor.env_schema import FileEnv
from tts_workflow.app.utils.logger.exec_logger import exec_logger


class JsonWriter(BaseWriter):
    __env_schema__ = FileEnv  # db_id + path 필요
    _file_extn: str = "json"
    _encoding: str = ENCODING_TYPE.UTF8

    def _setup(self) -> None:
        try:
            self._base_path = self._root_path / self.db_id / f"{self._file_name}.{self._file_extn}"
            exec_logger.info(f"Loading {self.__class__.__name__} from {self._base_path}")
        except Exception as e:
            exec_logger.error(f"Failed to connect JsonWriter: {e}")
            raise
        
    def close(self) -> None:
        """리소스 정리"""
        self._base_path = None
        exec_logger.debug("JsonWriter closed")

    def _create(self, data: Dict[str, Any]) -> bool:
        try:
            with open(self._base_path, 'w', encoding=self._encoding) as f:
                f.write(json.dumps(data, ensure_ascii=False, indent=2))
            exec_logger.info(f"Successfully wrote {self.__class__.__name__} to {self._base_path}")
            return True
        except Exception as e:
            exec_logger.error(f"Failed to write {self.__class__.__name__} to {self._base_path}: {e}")
            return False
