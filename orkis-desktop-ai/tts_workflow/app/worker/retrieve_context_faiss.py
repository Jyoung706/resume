import asyncio
from typing import Any, Dict, List, Tuple

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.service.faiss_context_search_service import FaissContextSearchService
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class RetrieveContextFaiss(Work):
    
    svc:FaissContextSearchService

    def __init__(self, conf:WorkInput, top_k: int):
        super().__init__(conf)
        self.top_k = top_k

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:

        retrieved_columns = await asyncio.to_thread(
            self.svc.find_most_similar_columns,
            question=state.rewritten_question,
            evidence=state.task.evidence,
            keywords=state.keywords,
            top_k=self.top_k,
        )

        return {
            "schema_with_descriptions": self._format_retrieved_descriptions(
                retrieved_columns
            )
        }, []

    
    def _format_retrieved_descriptions(
        self, retrieved_columns: Dict[str, Dict[str, Dict[str, str]]]
    ) -> Dict[str, Dict[str, Dict[str, str]]]:
        """
        Formats retrieved descriptions by removing the score key.

        Args:
            retrieved_columns (Dict[str, Dict[str, Dict[str, str]]]): The retrieved columns with descriptions.

        Returns:
            Dict[str, Dict[str, Dict[str, str]]]: The formatted descriptions.
        """
        exec_logger.info("Formatting retrieved descriptions")
        for column_descriptions in retrieved_columns.values():
            for column_info in column_descriptions.values():
                column_info.pop("score", None)
        return retrieved_columns
