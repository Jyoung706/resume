import ray
from typing import Dict, List, Any
from langchain_openai import OpenAIEmbeddings

from tts_workflow.core.ray.actor.resource_actor import ResourceActor
from tts_workflow.core.conf.ray_config import ray_config
from tts_workflow.app.utils.logger.exec_logger import exec_logger


@ray.remote(
    num_cpus=ray_config.EMBEDDING_ACTOR_NUM_CPUS,
    memory=ray_config.EMBEDDING_ACTOR_MEMORY_MB * 1024 * 1024
)
class OpenAIEmbeddingActor(ResourceActor):
    """
    OpenAI Embedding 전용 Actor

    - api_key별 인스턴스 캐싱
    - LRU + TTL 기반 Pool (max 5, TTL 30분)
    """
    _name:str = "OpenAIEmbeddingActor"

    def __init__(
        self,
        max_pool_size: int = 5,
        ttl_seconds: float = 1800.0,  # 30분
        model: str = "text-embedding-3-small",
    ):
        super().__init__(max_pool_size, ttl_seconds)
        self._model = model
        exec_logger.info(f"{self.name} initialized: model={model}")

    def _create_embeddings(self, api_key: str) -> OpenAIEmbeddings:
        """Embedding 인스턴스 생성"""
        return OpenAIEmbeddings(model=self._model, api_key=api_key)

    def set_pool(self, api_key: str) -> str:
        key = self._make_key(api_key=api_key)

        self._pool.put(
            key,
            None, 
            factory=lambda: self._create_embeddings(api_key)
        )
        
        return key
    
    def embed(self, key: str, texts: List[str]) -> List[List[float]]:
        """
        텍스트 임베딩

        Args:
            api_key: OpenAI API 키
            texts: 임베딩할 텍스트 리스트

        Returns:
            임베딩 벡터 리스트
        """
        if not texts:
            return []

        embeddings = self._pool.get(key)

        exec_logger.debug(f"{self.name}: Embedding {len(texts)} texts")
        return embeddings.embed_documents(texts)