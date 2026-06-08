
import faiss
from typing import Any, Dict, List, Tuple
import numpy as np


from tts_workflow.core.vector_search.constants import INDEX_TYPE
from tts_workflow.core.vector_search.exceptions import VectorDBError
from tts_workflow.core.vector_search.executor.base_executor import BaseWriter
from tts_workflow.core.vector_search.executor.env_schema import FaissEnv
from tts_workflow.app.utils.logger.exec_logger import exec_logger


class FaissWriter(BaseWriter):
    __env_schema__ = FaissEnv
    _file_extn: str = "index"
    _nbits: int = 256

    def _setup(self) -> None:
        try:
            self._base_path = self._root_path / self.db_id / self.path / f"{self.db_name}.{self._file_extn}"
            exec_logger.info(f"Loading {self.__class__.__name__} from {self._base_path}")
        except Exception as e:
            exec_logger.error(f"Failed to connect {self.__class__.__name__}: {e}")
            raise
        
    def close(self) -> None:
        """연결 종료"""
        try:
            self._conn = None
        except Exception as e:
                exec_logger.warning(f"Error closing {self.__class__.__name__}: {e}")

    def _create(self, queries_embedded: List[List[float]]) -> np.array:
        """
        FAISS 인덱스와 메타데이터 저장

        Args:
            data: 메타데이터 딕셔너리 리스트 (각 항목에 index_text 포함)
        """
        try:
            query_matrix = np.array(queries_embedded, dtype=np.float32)
            faiss.normalize_L2(query_matrix)

            dim = query_matrix.shape[1]

            match self._index_type:
                case INDEX_TYPE.FLAT:
                    base_index = faiss.IndexFlatIP(dim)
                case INDEX_TYPE.LSH:
                    base_index = faiss.IndexLSH(dim, self._nbits)
                case _:
                    raise ValueError(f"Not supported Index Type: {self._index_type}")
     
            index = faiss.IndexIDMap(base_index)

            faiss_ids = np.arange(len(query_matrix), dtype=np.int64)
            index.add_with_ids(query_matrix, faiss_ids)

            self._conn = faiss.write_index(index, str(self._base_path))

            return faiss_ids
        except Exception as e:
            exec_logger.error(f"Failed to save Faiss into {self._base_path}: {str(e)}")
            raise VectorDBError(f"Failed to save documents to Faiss: {str(e)}") from e