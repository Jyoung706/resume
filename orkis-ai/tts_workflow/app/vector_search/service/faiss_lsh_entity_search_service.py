import difflib
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.repository.faiss_lsh_data_repository import FaissLSHDataRepository
from tts_workflow.app.vector_search.repository.sqlite_source_repository import SqliteSourceRepository
from tts_workflow.core.vector_search.service.base_service import BaseService
from tts_workflow.core.vector_search.exceptions import ServiceError, DataNotFoundError, EmbeddingError

class FaissLSHEntitySearchService(BaseService):
    src_db_repo:SqliteSourceRepository
    vector_db_repo:FaissLSHDataRepository


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
        **kwargs
    ) -> Dict[str, List[str]]:
        try:
            if not keywords:
                exec_logger.warning("No keywords provided for entity search")
                return {}

            to_seartch_values = self._get_to_search_values(keywords)

            if not to_seartch_values:
                exec_logger.warning("No values to search after processing keywords")
                return {}

            similar_entities_via_LSH = self._get_similar_entities_via_LSH(to_seartch_values, top_k=top_k, distance_threshold=distance_threshold)

            if not similar_entities_via_LSH:
                exec_logger.info("No similar entities found via LSH")
                return {}

            similar_entities_via_edit_distance = (
                self._get_similar_entities_via_edit_distance(similar_entities_via_LSH, edit_distance_threshold)
            )

            if not similar_entities_via_edit_distance:
                exec_logger.info("No entities passed edit distance threshold")
                return {}

            similar_entities_via_embedding = self._get_similar_entities_via_embedding(
                similar_entities_via_edit_distance, embedding_similarity_threshold
            )

            if not similar_entities_via_embedding:
                exec_logger.info("No entities passed embedding similarity threshold")
                return {}

            selected_values = {}
            for entity in similar_entities_via_embedding:
                table_name = entity["table_name"]
                column_name = entity["column_name"]
                if table_name not in selected_values:
                    selected_values[table_name] = {}
                if column_name not in selected_values[table_name]:
                    selected_values[table_name][column_name] = []
                selected_values[table_name][column_name].append(entity)

            # 최적 값 필터링
            for table_name, column_values in selected_values.items():
                for column_name, values in column_values.items():
                    if not values:
                        continue

                    max_edit_distance_similarity = max(
                        entity["edit_distance_similarity"] for entity in values
                    )
                    values = [
                        entity
                        for entity in values
                        if entity["edit_distance_similarity"]
                        >= 0.9 * max_edit_distance_similarity
                    ]

                    if values:
                        max_embedding_similarity = max(
                            entity["embedding_similarity"] for entity in values
                        )
                        selected_values[table_name][column_name] = [
                            entity["similar_value"]
                            for entity in values
                            if entity["embedding_similarity"] >= 0.9 * max_embedding_similarity
                        ]

            exec_logger.info(f"Found similar entities in {len(selected_values)} tables")
            return selected_values

        except Exception as e:
            exec_logger.error(f"Entity similarity search failed: {str(e)}")
            raise ServiceError(f"Failed to find similar entities: {str(e)}") from e

    def _get_similar_entities_via_LSH(
        self, substring_packets: List[Dict[str, str]],
        top_k: int = 10,
        distance_threshold: float = 0.1,
    ) -> List[Dict[str, Any]]:
        try:
            search_strings = [packet["substring"] for packet in substring_packets]

            similar_entities = self.vector_db_repo.query(
                keywords=search_strings,
                top_k=top_k,
                distance_threshold=distance_threshold
            )

            if not similar_entities:
                exec_logger.info("No similar entities found via FAISS")
                return []

            # batch query 결과를 기존 형식에 맞게 변환
            similar_entities_via_LSH = []

            for packet in substring_packets:
                keyword = packet["keyword"]
                substring = packet["substring"]

                for table_name, column_values in similar_entities[substring].items():
                    for column_name, values in column_values.items():
                        for value in values:
                            similar_entities_via_LSH.append(
                                {
                                    "keyword": keyword,
                                    "substring": substring,
                                    "table_name": table_name,
                                    "column_name": column_name,
                                    "similar_value": value,
                                }
                            )

            return similar_entities_via_LSH

        except Exception as e:
            exec_logger.error(f"LSH entity search failed: {str(e)}")
            raise ServiceError(f"LSH search failed: {str(e)}") from e

    def _get_similar_entities_via_embedding(
        self, similar_entities_via_edit_distance: List[Dict[str, Any]], embedding_similarity_threshold:float
    ) -> List[Dict[str, Any]]:
        similar_values_dict = {}
        to_embed_strings = []
        for entity_packet in similar_entities_via_edit_distance:
            keyword = entity_packet["keyword"]
            substring = entity_packet["substring"]
            similar_value = entity_packet["similar_value"]
            if keyword not in similar_values_dict:
                similar_values_dict[keyword] = {}
            if substring not in similar_values_dict[keyword]:
                similar_values_dict[keyword][substring] = []
                to_embed_strings.append(substring)
            similar_values_dict[keyword][substring].append(entity_packet)
            to_embed_strings.append(similar_value)

        try:
            all_embeddings = self.vector_db_repo.embedding(to_embed_strings)

            if not all_embeddings or len(all_embeddings) != len(to_embed_strings):
                raise EmbeddingError(f"Expected {len(to_embed_strings)} embeddings, got {len(all_embeddings) if all_embeddings else 0}")

        except Exception as e:
            exec_logger.error(f"Failed to generate embeddings: {str(e)}")
            raise EmbeddingError(f"Embedding generation failed: {str(e)}") from e
        similar_entities_via_embedding_similarity = []
        index = 0
        for keyword, substring_dict in similar_values_dict.items():
            for substring, entity_packets in substring_dict.items():
                substring_embedding = all_embeddings[index]
                index += 1
                similar_values_embeddings = all_embeddings[
                    index : index + len(entity_packets)
                ]
                index += len(entity_packets)
                similarities = np.dot(similar_values_embeddings, substring_embedding)
                for i, entity_packet in enumerate(entity_packets):
                    if similarities[i] >= embedding_similarity_threshold:
                        entity_packet["embedding_similarity"] = similarities[i]
                        similar_entities_via_embedding_similarity.append(entity_packet)
        return similar_entities_via_embedding_similarity

    def _get_to_search_values(self, keywords: List[str]) -> List[str]:
        """
        Extracts values to search from the keywords.

        Args:
            keywords (List[str]): The list of keywords.

        Returns:
            List[str]: A list of values to search.
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
                        second_part = keyword[i + 1 :]
                        to_search_values.append(
                            get_substring_packet(keyword, first_part)
                        )
                        to_search_values.append(
                            get_substring_packet(keyword, second_part)
                        )
            hint_column, hint_value = self._column_value(keyword)
            if hint_value:
                to_search_values.append(get_substring_packet(keyword, hint_value))
        to_search_values.sort(
            key=lambda x: (x["keyword"], len(x["substring"]), x["substring"]),
            reverse=True,
        )
        return to_search_values

    @staticmethod
    def _get_similar_entities_via_edit_distance(
        similar_entities_via_LSH: List[Dict[str, Any]],
        edit_distance_threshold: float
    ) -> List[Dict[str, Any]]:
        similar_entities_via_edit_distance_similarity = []
        for entity_packet in similar_entities_via_LSH:
            edit_distance_similarity = difflib.SequenceMatcher(
                None,
                entity_packet["substring"].lower(),
                entity_packet["similar_value"].lower(),
            ).ratio()
            if edit_distance_similarity >= edit_distance_threshold:
                entity_packet["edit_distance_similarity"] = edit_distance_similarity
                similar_entities_via_edit_distance_similarity.append(entity_packet)
        return similar_entities_via_edit_distance_similarity

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
                string[left_equal + 1 :].strip()
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
                found_string = string[start : i + 1]
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
