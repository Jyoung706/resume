"""
로컬 Executor (Ray 없이 동작)

OpenAIVectorizer → LocalOpenAIVectorizer: OpenAIEmbeddings 직접 호출
FaissReader → LocalFaissReader: faiss 인덱스 직접 로드/검색

handler.py의 _init_once()에서 ExecutorConfig.executor_cls를 교체하여
기존 Repository 코드 변경 없이 동작.
"""
import faiss
import numpy as np
from typing import List, Tuple

from langchain_openai import OpenAIEmbeddings

from tts_workflow.core.vector_search.constants import INDEX_TYPE
from tts_workflow.core.vector_search.exceptions import VectorSearchError
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import OpenaiAPIEnv, FaissEnv
from tts_workflow.app.utils.logger.exec_logger import exec_logger


class LocalOpenAIVectorizer(BaseReader):
    """OpenAIVectorizer 로컬 대체 (Ray 없이 동작)"""
    __env_schema__ = OpenaiAPIEnv
    # Ray OpenAIEmbeddingActor 기본값과 동일 (FAISS 인덱스 빌드 시 사용된 모델)
    _embedding_function_model: str = "text-embedding-3-small"

    def _setup(self) -> None:
        self._conn = None
        try:
            self._embeddings = OpenAIEmbeddings(
                model=self._embedding_function_model,
                api_key=self._api_key,
            )
            exec_logger.info(f"[Local] OpenAI Embedding Model loaded: {self._embedding_function_model}")
        except Exception as e:
            exec_logger.error(f"Failed to init {self.__class__.__name__}: {e}")
            raise

    def close(self) -> None:
        self._conn = None
        self._embeddings = None

    def embedding(self, queries: List[str]) -> List[List[float]]:
        if not queries:
            return []
        return self._embeddings.embed_documents(queries)


class LocalFaissReader(BaseReader):
    """FaissReader 로컬 대체 (Ray 없이 동작)"""
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
            exec_logger.info(f"[Local] Faiss index loaded: {self._base_path}")
        except Exception as e:
            exec_logger.error(f"Failed to init {self.__class__.__name__}: {e}")
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
            raise VectorSearchError(f"Failed to perform similarity search: {e}") from e
