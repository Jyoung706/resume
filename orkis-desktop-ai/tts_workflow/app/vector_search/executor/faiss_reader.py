"""
FAISS Index Reader (데스크탑 전용)

Ray Actor 대신 faiss 라이브러리를 직접 호출.
"""
import faiss
import numpy as np
from typing import List, Tuple

from tts_workflow.core.vector_search.constants import INDEX_TYPE
from tts_workflow.core.vector_search.exceptions import VectorSearchError
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import FaissEnv
from tts_workflow.app.utils.logger.exec_logger import exec_logger


class FaissReader(BaseReader):
    """FAISS 읽기 전용 Executor"""

    __env_schema__ = FaissEnv
    _file_extn: str = "index"
    _nbits: int = 256

    def _setup(self) -> None:
        self._conn = None
        try:
            self._base_path = (
                self._root_path / self.db_id / self.path / f"{self.db_name}.{self._file_extn}"
            )
            self._index = faiss.read_index(str(self._base_path))
            exec_logger.info(f"Loading {self.__class__.__name__} from {self._base_path}")
        except Exception as e:
            exec_logger.error(f"Failed to connect {self.__class__.__name__}: {e}")
            raise

    def close(self) -> None:
        self._conn = None
        self._index = None

    def query(
        self,
        queries_embedded: List[List[float]],
        top_k: int,
    ) -> Tuple[List, List, List]:
        try:
            query_matrix = np.array(queries_embedded, dtype=np.float32)
            faiss.normalize_L2(query_matrix)
            distances, ids_matrix = self._index.search(query_matrix, top_k)

            if self._index_type == INDEX_TYPE.LSH:
                distances = 1.0 - (distances / self._nbits)

            all_ids = set()
            for ids_row in ids_matrix:
                all_ids.update(int(fid) for fid in ids_row if fid != -1)

            return distances.tolist(), ids_matrix.tolist(), list(all_ids)
        except Exception as e:
            raise VectorSearchError(f"Failed to perform similarity search: {str(e)}") from e
