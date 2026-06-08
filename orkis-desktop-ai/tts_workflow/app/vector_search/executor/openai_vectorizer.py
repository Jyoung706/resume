"""
OpenAI Embedding Executor (데스크탑 전용)

Ray Actor 대신 OpenAIEmbeddings를 직접 호출.
"""
from typing import List

from langchain_openai import OpenAIEmbeddings

from tts_workflow.core.conf.config import config
from tts_workflow.core.vector_search.exceptions import VectorSearchError
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import OpenaiAPIEnv
from tts_workflow.app.utils.logger.exec_logger import exec_logger


class OpenAIVectorizer(BaseReader):
    """OpenAI Embedding 전용 Executor"""
    __env_schema__ = OpenaiAPIEnv

    _embedding_function_model: str = config.EMBEDDING_FUNCTION_MODEL

    def _setup(self) -> None:
        self._conn = None
        try:
            self._embeddings = OpenAIEmbeddings(
                model=self._embedding_function_model,
                api_key=self._api_key,
            )
            exec_logger.info(f"Loading OpenAI Embedding Model {self._embedding_function_model}")
        except Exception as e:
            exec_logger.error(f"Failed to connect {self.__class__.__name__}: {e}")
            raise

    def close(self) -> None:
        self._conn = None
        self._embeddings = None

    def embedding(self, queries: List[str]) -> List[List[float]]:
        try:
            if not queries:
                return []
            return self._embeddings.embed_documents(queries)
        except Exception as e:
            error_msg = str(e).lower()
            if "api key" in error_msg or "unauthorized" in error_msg or "authentication" in error_msg:
                exec_logger.error(f"Invalid OpenAI API key.: {str(e)}")
                raise ConnectionError(f"Invalid OpenAI API key. Please check your API key.") from e
            exec_logger.error(f"Batch similarity search failed: {str(e)}")
            raise VectorSearchError(f"Failed to embedding: {str(e)}") from e
