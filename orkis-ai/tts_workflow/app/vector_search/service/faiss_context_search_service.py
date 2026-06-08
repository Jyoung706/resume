
from typing import Dict, List

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.repository.faiss_schema_repository import FaissSchemaRepository
from tts_workflow.core.vector_search.service.base_service import BaseService

class FaissContextSearchService(BaseService):
    """
    스키마 유사도 조회 Service
    """
    repo:FaissSchemaRepository

    def find_most_similar_columns(
        self,
        *,
        question:str,
        evidence:str,
        keywords:List[str],
        top_k:int,
        **kwargs
    ) -> Dict[str, Dict[str, Dict[str, str]]]:

        exec_logger.debug("Finding the most similar columns")
        tables_with_descriptions = {}

        # 모든 쿼리를 미리 생성하여 배치 처리
        queries = []
        for keyword in keywords:
            queries.append(f"{question} {keyword}")
            if evidence:
                queries.append(f"{evidence} {keyword}")

        if not queries:
            return tables_with_descriptions

        # 배치 검색 수행 (한 번의 API 호출 + 한 번의 DB 조회)
        batch_results = self.repo.query(
            queries=queries,
            top_k=top_k
        )

        # 모든 결과를 병합
        for retrieved_descriptions in batch_results:
            tables_with_descriptions = self._add_description(
                tables_with_descriptions, retrieved_descriptions
            )

        return tables_with_descriptions

    @staticmethod
    def _add_description(
        tables_with_descriptions: Dict[str, Dict[str, Dict[str, str]]],
        retrieved_descriptions: Dict[str, Dict[str, Dict[str, str]]],
    ) -> Dict[str, Dict[str, Dict[str, str]]]:
        """
        Adds descriptions to tables from retrieved descriptions.

        Args:
            tables_with_descriptions (Dict[str, Dict[str, Dict[str, str]]]): The current tables with descriptions.
            retrieved_descriptions (Dict[str, Dict[str, Dict[str, str]]]): The retrieved descriptions.

        Returns:
            Dict[str, Dict[str, Dict[str, str]]]: The updated tables with descriptions.
        """
        if retrieved_descriptions is None:
            exec_logger.warning("No descriptions retrieved")
            return tables_with_descriptions
        for table_name, column_descriptions in retrieved_descriptions.items():
            if table_name not in tables_with_descriptions:
                tables_with_descriptions[table_name] = {}
            for column_name, description in column_descriptions.items():
                if (
                    column_name not in tables_with_descriptions[table_name]
                    or description["score"]
                    > tables_with_descriptions[table_name][column_name]["score"]
                ):
                    tables_with_descriptions[table_name][column_name] = description
        return tables_with_descriptions