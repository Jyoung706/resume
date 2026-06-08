from typing import Any, Dict, List, Tuple

from tts_workflow.app.vector_search.service.faiss_lsh_entity_search_service import FaissLSHEntitySearchService
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class RetrieveEntityFaiss(Work):
    """FAISS 기반 Entity 검색 Worker"""

    svc:FaissLSHEntitySearchService

    def __init__(self, conf: WorkInput, top_k: int, faiss_distance_threshold:float):
        super().__init__(conf)
        self.top_k = top_k
        self.faiss_distance_threshold = faiss_distance_threshold
        self.edit_distance_threshold = 0.3
        self.embedding_similarity_threshold = 0.6

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:

        similar_columns = self.svc.get_similar_columns(
            keywords=state.keywords,
            question=state.rewritten_question,
            hint=state.task.evidence
        )

        schema_with_examples = self.svc.get_similar_entities(
            keywords=state.keywords,
            top_k=self.top_k,
            distance_threshold=self.faiss_distance_threshold,
            edit_distance_threshold=self.edit_distance_threshold,
            embedding_similarity_threshold=self.embedding_similarity_threshold
        )

        return {
            "similar_columns": similar_columns,
            "schema_with_examples": schema_with_examples,
        }, []
