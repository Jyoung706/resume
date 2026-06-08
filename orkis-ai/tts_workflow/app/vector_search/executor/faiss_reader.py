import faiss
from typing import Any, Dict, List, Tuple
import numpy as np
import ray

from tts_workflow.core.vector_search.constants import INDEX_TYPE
from tts_workflow.core.vector_search.exceptions import VectorSearchError
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import FaissEnv
from tts_workflow.core.ray.actor_manager import get_faiss_actor
from tts_workflow.app.utils.logger.exec_logger import exec_logger


class FaissReader(BaseReader):
    """Faiss 읽기 전용 Executor"""

    __env_schema__ = FaissEnv
    _file_extn: str = "index"
    _nbits: int = 256

    def _setup(self) -> None:
        self._conn = None
        self._actor = None
        self._key = None

        try:
            self._base_path = self._root_path / self.db_id / self.path / f"{self.db_name}.{self._file_extn}"

            self._actor = get_faiss_actor()
            self._key = ray.get(self._actor.run_on_thread.remote(
                method_name="set_pool",
                db_id=self.db_id,
                path=self.path,
                index_path=self._base_path
            ))

            exec_logger.info(f"Loading {self.__class__.__name__} from {self._base_path}")
        except Exception as e:
            exec_logger.error(f"Failed to connect {self.__class__.__name__}: {e}")
            raise

    def close(self) -> None:
        """연결 종료"""
        try:
            self._conn = None
            self._actor = None
            self._key = None
        except Exception as e:
            exec_logger.warning(f"Error closing {self.__class__.__name__}: {e}")

    def query(
        self,
        queries_embedded: List[List[float]],
        top_k: int
    ) -> List[List[Tuple[Dict[str, Any], float]]]:
        """
        유사도 검색 후 index 반환

        Args:
            queries: 검색할 쿼리 문자열 리스트
            top_k: 각 쿼리당 반환할 결과 수

        Returns:
            각 쿼리별 (metadata, score) 튜플 리스트의 리스트
        """
        try:
            return ray.get(self._actor.run_on_thread.remote(
                method_name="search",
                key=self._key,
                query_vectors=queries_embedded,
                top_k=top_k,
                index_type=self._index_type,
                nbits=self._nbits
            ))
        except Exception as e:
            raise VectorSearchError(f"Failed to perform similarity search: {str(e)}") from e