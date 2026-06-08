import ray
import faiss

import numpy as np
from typing import List, Tuple
from pathlib import Path

from tts_workflow.core.ray.actor.resource_actor import ResourceActor
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.conf.config import config
from tts_workflow.core.conf.ray_config import ray_config
from tts_workflow.core.vector_search.constants import INDEX_TYPE
import asyncio

@ray.remote(
    num_cpus=ray_config.FAISS_ACTOR_NUM_CPUS,
    memory=ray_config.FAISS_ACTOR_MEMORY_MB * 1024 * 1024
)
class FaissActor(ResourceActor):
    """
    Faiss Index 전용 Actor (Async + ThreadPool)

    - db_id + path별 Index 캐싱
    - LRU + TTL 기반 Pool (max 5, TTL 30분)
    - ThreadPoolExecutor로 CPU 바운드 작업 병렬 처리
    """
    _name: str = "FaissActor"

    def __init__(
        self,
        max_pool_size: int = 5,
        ttl_seconds: float = 1800.0,
        max_workers: int = 4,
        root_path: str = config.DB_ROOT_PATH
    ):
        super().__init__(max_pool_size, ttl_seconds, max_workers=max_workers)
        self._root_path = Path(root_path)
        
        exec_logger.info(f"{self.name} initialized: root={root_path}, workers={max_workers}")

    def set_pool(self, db_id: str, path: str, index_path: str) -> str:
        key = self._make_key(db_id=db_id, path=path)
        self._pool.put(
            key,
            None,
            factory=lambda: faiss.read_index(str(index_path))
        )
        exec_logger.info(f"{self.name}: Loaded index from {index_path}")
        return key

    def search(
        self,
        key: str,
        query_vectors: List[List[float]],
        top_k: int,
        index_type: str,
        nbits: int
    ) -> Tuple[List, List, List]:
        index = self._pool.get(key)

        if index is None:
            raise ValueError(f"{self.name}: Index not found for key {key}")

        query_matrix = np.array(query_vectors, dtype=np.float32)
        faiss.normalize_L2(query_matrix)

        distances, ids_matrix = index.search(query_matrix, top_k)

        if index_type == INDEX_TYPE.LSH:
            distances = 1.0 - (distances / nbits)

        all_ids = set()
        for ids_row in ids_matrix:
            all_ids.update(int(fid) for fid in ids_row if fid != -1)

        exec_logger.debug(f"{self.name}: Search completed, found {len(all_ids)} unique IDs")
        return distances.tolist(), ids_matrix.tolist(), list(all_ids)
