from typing import Any, Dict, List

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.executor.duckdb_writer import DuckDBWriter
from tts_workflow.app.vector_search.executor.faiss_reader import FaissReader
from tts_workflow.app.vector_search.executor.duckdb_reader import DuckDBReader
from tts_workflow.app.vector_search.executor.faiss_writer import FaissWriter
from tts_workflow.app.vector_search.executor.openai_vectorizer import OpenAIVectorizer
from tts_workflow.core.vector_search.constants import INDEX_TYPE
from tts_workflow.core.vector_search.executor.config import ExecutorConfig
from tts_workflow.core.vector_search.repository.data_vector_db_repository import DataVectorDBRepository
from tts_workflow.core.vector_search.sql.duckdb_sql import SQL


class FaissDataRepository(DataVectorDBRepository):
    embedding_model= ExecutorConfig(OpenAIVectorizer)
    db_reader= ExecutorConfig(DuckDBReader, path="data_vector_db")
    db_writer= ExecutorConfig(DuckDBWriter, path="data_vector_db")
    vector_db_reader= ExecutorConfig(FaissReader, path="data_vector_db", index_type=INDEX_TYPE.FLAT)
    vector_db_writer= ExecutorConfig(FaissWriter, path="data_vector_db", index_type=INDEX_TYPE.FLAT)
    
    def create(self, unique_values: Dict[str, Dict[str, List[str]]]) -> bool:
        """
        Faiss DATA Vector DB 생성

        Args:
            unique_values (Dict[str, Dict[str, List[str]]]): 고유값 정의 딕셔너리
        Returns:
            bool: 생성 성공 여부
        """
        try:
            # unique_values를 docs 형태로 변환
            docs = []
            for table_name, columns in unique_values.items():
                for column_name, values in columns.items():
                    for value in values:
                        if not value or not value.strip():
                            continue
                        docs.append({
                            "table_name": table_name,
                            "column_name": column_name,
                            "index_text": value.strip()
                        })

            texts = [item['index_text'] for item in docs]
            texts_embedded = self.embedding_model.embedding(texts)
            
            # faiss 생성
            faiss_ids = self.vector_db_writer.create(texts_embedded)

            # duckdb 생성
            self.db_writer.create(ddl_sqls=[SQL.CREATE_FAISS_DATA_TABLE])
            
            values = [
                (int(fid), doc["table_name"], doc["column_name"], doc["index_text"])
                for fid, doc in zip(faiss_ids, docs)
            ]

            self.db_writer.executemany(SQL.INSERT_FAISS_DATA_VALUES, values)

            return True
        except Exception as e:
            self.vector_db_writer.clear()
            self.db_writer.clear()
            raise e
    
    def query(self, keywords: List[str], top_k: int, distance_threshold: float = 0.5) -> Dict[str, Dict[str, List[str]]]:
        # 쿼리 embedding
        keywords_embedded = self.embedding_model.embedding(keywords)

        # faiss 검색 및 유효 ID 수집
        distances, ids_matrix, all_ids = self.vector_db_reader.query(keywords_embedded, top_k=top_k)

        exec_logger.debug(f"Batch query executed successfully for {len(keywords)} queries")

        if not all_ids:
            return {}

        # meta data 조회
        metadata_raws = self._get_metadata_by_ids(all_ids)
        
        # faiss id <-> metadata 매칭
        id_to_metadata = {
            row[0]: {"table_name": row[1], "column_name": row[2], "value": row[3]}
            for row in metadata_raws
        }

        # 쿼리별 결과 조합
        final_results = []
        for ids_row, dist_row in zip(ids_matrix, distances):
            query_results = []
            for faiss_id, score in zip(ids_row, dist_row):
                if faiss_id == -1:
                    continue
                metadata = id_to_metadata.get(int(faiss_id))
                if metadata:
                    query_results.append((metadata, float(score)))
            final_results.append(query_results)

        exec_logger.debug(f"Batch search completed: {len(keywords)} queries processed")

        # 모든 결과를 병합 (입력 keywords 별로)
        merged_results: Dict[str, Dict[str, List[str]]] = {}

        for ind, results in enumerate(final_results):
            keyword_result = {}
            # 각 쿼리 결과는 score 내림차순 정렬됨
            for metadata, score in results:
                if score < distance_threshold:
                    break  # 이후 결과는 모두 threshold 미만

                table_name = metadata.get("table_name", "")
                column_name = metadata.get("column_name", "")
                value = metadata.get("value", "")

                if not table_name or not column_name:
                    continue

                if table_name not in keyword_result:
                    keyword_result[table_name] = {}

                if column_name not in keyword_result[table_name]:
                    keyword_result[table_name][column_name] = []

                if value and value not in keyword_result[table_name][column_name]:
                    keyword_result[table_name][column_name].append(value)

            merged_results[keywords[ind]] = keyword_result

        return merged_results
    
    def status(self) -> bool:
        try:
            return bool(self.db_reader and self.vector_db_reader)
        except Exception as e:
            exec_logger.debug(f"Cannot Connect DB.")
            return False

    def _get_metadata_by_ids(self, all_faiss_ids:List) -> Any:
        placeholders = ','.join(['?'] * len(all_faiss_ids))
        result = self.db_reader.query(
            SQL.FAISS_DATA_SEARCH_METADATA_BY_IDS.format(placeholders=placeholders), 
            params=list(all_faiss_ids))
        
        return result