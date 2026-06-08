
from collections import defaultdict
import difflib
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.repository.faiss_data_repository import FaissDataRepository
from tts_workflow.app.vector_search.repository.sqlite_source_repository import SqliteSourceRepository
from tts_workflow.core.vector_search.service.base_service import BaseService
from tts_workflow.core.vector_search.exceptions import ServiceError, DataNotFoundError

class FaissEntitySearchService(BaseService):
    src_db_repo:SqliteSourceRepository
    vector_db_repo:FaissDataRepository

    ### Column name similarity ###
    def get_similar_columns(
        self, keywords: List[str], question: str, hint: str
    ) -> Dict[str, List[str]]:
        """
        Finds columns similar to given keywords based on question and hint.

        Args:
            keywords (List[str]): The list of keywords.
            question (str): The question string.
            hint (str): The hint string.

        Returns:
            Dict[str, List[str]]: A dictionary mapping table names to lists of similar column names.
        """
        try:
            if not keywords:
                exec_logger.warning("No keywords provided for column search")
                return {}

            selected_columns = {}
            similar_columns = self._get_similar_column_names(
                keywords=keywords, question=question, hint=hint
            )

            for table_name, column_name in similar_columns:
                if table_name not in selected_columns:
                    selected_columns[table_name] = []
                if column_name not in selected_columns[table_name]:
                    selected_columns[table_name].append(column_name)

            exec_logger.info(f"Found {sum(len(cols) for cols in selected_columns.values())} similar columns across {len(selected_columns)} tables")
            return selected_columns

        except Exception as e:
            exec_logger.error(f"Failed to find similar columns: {str(e)}")
            raise ServiceError(f"Column similarity search failed: {str(e)}") from e

    def _get_similar_column_names(
        self, keywords: List[str], question: str, hint: str
    ) -> List[Tuple[str, str]]:
        """
        Finds column names similar to given keywords using string matching only.

        Note: question and hint are kept for API compatibility but not used.
        Embedding-based scoring was removed as downstream consumers use all
        matched columns without top_k cutoff, making scoring pointless.

        Args:
            keywords (List[str]): The list of keywords.
            question (str): The question string (unused, kept for compatibility).
            hint (str): The hint string (unused, kept for compatibility).

        Returns:
            List[Tuple[str, str]]: A list of tuples containing table and column names.
        """
        # 키워드에서 잠재적 컬럼명 후보 추출
        potential_column_names = []
        for keyword in keywords:
            keyword = keyword.strip()
            potential_column_names.append(keyword)

            column, value = self._column_value(keyword)
            if column:
                potential_column_names.append(column)

            potential_column_names.extend(self._extract_paranthesis(keyword))

            if " " in keyword:
                potential_column_names.extend(part.strip() for part in keyword.split())

        try:
            schema = self.src_db_repo.get_db_schema()

            if not schema:
                raise DataNotFoundError("No database schema found")

        except Exception as e:
            exec_logger.error(f"Failed to get database schema: {str(e)}")
            raise ServiceError(f"Schema retrieval failed: {str(e)}") from e

        # 문자열 매칭만으로 유사 컬럼 찾기 (임베딩 없음)
        similar_column_names = set()
        for table, columns in schema.items():
            for column in columns:
                for potential_column_name in potential_column_names:
                    if self._does_keyword_match_column(potential_column_name, column):
                        similar_column_names.add((table, column))
                        break 

        return list(similar_column_names)

    ### Entity similarity ###
    def get_similar_entities(
        self,
        *,
        keywords: List[str],
        edit_distance_threshold:float,
        embedding_similarity_threshold:float,
        top_k: int = 20,
        distance_threshold: float = 0.5,
    ) -> Dict[str, Dict[str, List[str]]]:
        """
        FAISS 벡터 검색으로 유사 entity 검색

        기존 3단계 → 1단계로 단순화:
        - LSH 후보 추출 → FAISS similarity search
        - edit distance 필터링 → 제거
        - embedding similarity → FAISS score로 대체

        Args:
            keywords: 검색할 키워드 리스트
            top_k: 각 키워드당 반환할 최대 결과 수
            distance_threshold: 유사도 임계값 (0~1, 기본값 0.5)

        Returns:
            Dict[table_name, Dict[column_name, List[values]]]
        """
        try:
            if not keywords:
                exec_logger.warning("No keywords provided for entity search")
                return {}

            # 키워드에서 검색할 값 추출 (기존 로직 재사용)
            to_search_values = self._get_to_search_values(keywords)

            if not to_search_values:
                exec_logger.warning("No values to search after processing keywords")
                return {}

            # 검색할 substring 리스트 추출
            search_strings = [packet["substring"] for packet in to_search_values]

            # FAISS 배치 검색
            similar_entities = self.vector_db_repo.query(
                keywords=search_strings,
                top_k=top_k,
                distance_threshold=distance_threshold
            )

            if not similar_entities:
                exec_logger.info("No similar entities found via FAISS")
                return {}

            exec_logger.info(f"Found similar entities in {len(similar_entities)} tables")

            results = defaultdict(lambda: defaultdict(set))

            for table_values in similar_entities.values():
                for table_name, column_values in table_values.items():
                    for column_name, values in column_values.items():
                        results[table_name][column_name].update(
                            v for v in values if v
                        )
                            
            return { table: {
                            column: list(values)
                            for column, values in columns.items()
                        }
                        for table, columns in results.items()
                    }

        except Exception as e:
            exec_logger.error(f"Entity similarity search failed: {str(e)}")
            raise ServiceError(f"Failed to find similar entities: {str(e)}") from e

    @staticmethod
    def _get_to_search_values(keywords: List[str]) -> List[Dict[str, str]]:
        """
        Extracts values to search from the keywords.

        Args:
            keywords (List[str]): The list of keywords.

        Returns:
            List[Dict[str, str]]: A list of dicts with keyword and substring.
        """

        def get_substring_packet(keyword: str, substring: str) -> Dict[str, str]:
            return {"keyword": keyword, "substring": substring}

        to_search_values = []
        for keyword in keywords:
            keyword = keyword.strip()
            to_search_values.append(get_substring_packet(keyword, keyword))
            if " " in keyword:
                for i in range(len(keyword)):
                    if keyword[i] == " ":
                        first_part = keyword[:i]
                        second_part = keyword[i + 1:]
                        to_search_values.append(
                            get_substring_packet(keyword, first_part)
                        )
                        to_search_values.append(
                            get_substring_packet(keyword, second_part)
                        )
            hint_column, hint_value = FaissEntitySearchService._column_value(keyword)
            if hint_value:
                to_search_values.append(get_substring_packet(keyword, hint_value))
        to_search_values.sort(
            key=lambda x: (x["keyword"], len(x["substring"]), x["substring"]),
            reverse=True,
        )
        return to_search_values

    ### Common utility methods ###
    @staticmethod
    def _column_value(string: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Splits a string into column and value parts if it contains '='.

        Args:
            string (str): The string to split.

        Returns:
            Tuple[Optional[str], Optional[str]]: The column and value parts.
        """
        if "=" in string:
            left_equal = string.find("=")
            first_part = string[:left_equal].strip()
            second_part = (
                string[left_equal + 1:].strip()
                if len(string) > left_equal + 1
                else None
            )
            return first_part, second_part
        return None, None

    @staticmethod
    def _extract_paranthesis(string: str) -> List[str]:
        """
        Extracts strings within parentheses from a given string.

        Args:
            string (str): The string to extract from.

        Returns:
            List[str]: A list of strings within parentheses.
        """
        paranthesis_matches = []
        open_paranthesis = []
        for i, char in enumerate(string):
            if char == "(":
                open_paranthesis.append(i)
            elif char == ")" and open_paranthesis:
                start = open_paranthesis.pop()
                found_string = string[start: i + 1]
                if found_string:
                    paranthesis_matches.append(found_string)
        return paranthesis_matches

    @staticmethod
    def _does_keyword_match_column(
        keyword: str, column_name: str, threshold: float = 0.9
    ) -> bool:
        """
        Checks if a keyword matches a column name based on similarity.

        Args:
            keyword (str): The keyword to match.
            column_name (str): The column name to match against.
            threshold (float, optional): The similarity threshold. Defaults to 0.9.

        Returns:
            bool: True if the keyword matches the column name, False otherwise.
        """
        keyword = keyword.lower().replace(" ", "").replace("_", "").rstrip("s")
        column_name = column_name.lower().replace(" ", "").replace("_", "").rstrip("s")
        similarity = difflib.SequenceMatcher(None, column_name, keyword).ratio()
        return similarity >= threshold
