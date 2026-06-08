from typing import List
import ray

from tts_workflow.core.conf.config import config
from tts_workflow.core.vector_search.exceptions import VectorSearchError
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import OpenaiAPIEnv
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.ray.actor_manager import get_embedding_actor

class OpenAIVectorizer(BaseReader):
    """Openai embeddding 전용 Executor"""
    __env_schema__ = OpenaiAPIEnv

    _embedding_function_model: str = config.EMBEDDING_FUNCTION_MODEL

    def _setup(self) -> None:
        self._conn = None

        try:
            self._actor = get_embedding_actor()
            self._key = ray.get(self._actor.run_on_thread.remote(
                method_name="set_pool",
                api_key=self._api_key
            ))

            exec_logger.info(f"Loading Open Ai Embedding Model {self._embedding_function_model}")
        except Exception as e:
            exec_logger.error(f"Failed to connect {self.__class__.__name__}: {e}")
            raise
    
    def close(self) -> None:
        """연결 종료"""
        try:
            # 객체 참조 제거
            self._conn = None
            self._actor = None
            self._key = None
        except Exception as e:
                exec_logger.warning(f"Error closing {self.__class__.__name__}: {e}")
    
    def embedding(
        self,
        queries: List[str]
    ) -> List[List[float]]:
        
        try:
            return ray.get(self._actor.run_on_thread.remote(
                method_name="embed",
                key=self._key,
                texts=queries
            ))
        except Exception as e:
            error_msg = str(e).lower()

            if "api key" in error_msg or "unauthorized" in error_msg or "authentication" in error_msg:
                exec_logger.error(f"Invalid OpenAI API key.: {str(e)}")
                raise ConnectionError(f"Invalid OpenAI API key. Please check your API key.") from e
            
            exec_logger.error(f"Batch similarity search failed: {str(e)}")
            
            raise VectorSearchError(f"Failed to embedding: {str(e)}") from e
