from typing import Any, Dict, List

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.executor.duckdb_writer import DuckDBWriter
from tts_workflow.app.vector_search.executor.faiss_reader import FaissReader
from tts_workflow.app.vector_search.executor.duckdb_reader import DuckDBReader
from tts_workflow.app.vector_search.executor.faiss_writer import FaissWriter
from tts_workflow.app.vector_search.executor.openai_vectorizer import OpenAIVectorizer
from tts_workflow.core.vector_search.constants import INDEX_TYPE
from tts_workflow.core.vector_search.executor.config import ExecutorConfig
from tts_workflow.core.vector_search.repository.schema_vector_db_repository import SchemaVectorDBRepository
from tts_workflow.core.vector_search.sql.duckdb_sql import SQL
from tts_workflow.core.database.utils.schema import ColumnInfo

class FaissSchemaRepository(SchemaVectorDBRepository):
    embedding_model= ExecutorConfig(OpenAIVectorizer)
    db_reader= ExecutorConfig(DuckDBReader, path="schema_vector_db")
    db_writer= ExecutorConfig(DuckDBWriter, path="schema_vector_db")
    vector_db_reader= ExecutorConfig(FaissReader, path="schema_vector_db", index_type=INDEX_TYPE.FLAT)
    vector_db_writer= ExecutorConfig(FaissWriter, path="schema_vector_db", index_type=INDEX_TYPE.FLAT)

    def create(self, tables_description: Dict[str, Dict[str, ColumnInfo]]) -> bool:
        """
        Faiss Schema Vector DB 생성

        Args:
            tables_description (Dict[str, Dict[str, ColumnInfo]]): 테이블별 컬럼 설명 딕셔너리
        Returns:
            bool: 생성 성공 여부
        """
        try:
            docs = []

            for table_name, col_desc in tables_description.items():
                for column_name, column_info in col_desc.items():
                    base_metadata = {
                        "table_name": table_name,
                        "original_column_name": column_name,
                        "column_name": column_info.column_name,
                        "column_description": column_info.column_description,
                        "value_description": column_info.value_description
                    }

                    for data in [column_info.column_name, column_info.column_description, column_info.value_description]:
                        if not data.strip(): 
                            continue

                        doc = base_metadata.copy()
                        doc['index_text'] = data
                        docs.append(doc)

            if not docs:
                exec_logger.warning("No documents to save to Faiss")
                return False
            
            # embedding
            texts = [item['index_text'] for item in docs]
            texts_embedded = self.embedding_model.embedding(texts)
            
            # faiss 생성
            faiss_ids = self.vector_db_writer.create(texts_embedded)
            
            # duckdb 생성
            self.db_writer.create([SQL.CREATE_FAISS_SCHEMA_TABLE])

            values = [
                        [int(fid), item['index_text'], 
                        item['table_name'], item['original_column_name'],
                        item['column_name'], item['column_description'], 
                        item['value_description']]
                    for fid, item in zip(faiss_ids, docs)]
            
            self.db_writer.executemany(SQL.INSERT_FAISS_SCHEMA_VALUES, values)

            return True
        except Exception as e:
            self.vector_db_writer.clear()
            self.db_writer.clear()
            raise e
         
    def query(self, queries: List[str], top_k: int) -> List[Dict]:
        # 쿼리 embedding
        queries_embedded = self.embedding_model.embedding(queries)

        # faiss 검색 및 유효 ID 수집
        distances, ids_matrix, all_ids = self.vector_db_reader.query(queries_embedded, top_k=top_k)

        exec_logger.debug(f"Batch query executed successfully for {len(queries)} queries")

        if not all_ids:
            return []

        # meta data 조회
        metadata_raws = self._get_metadata_by_ids(all_ids)

        # faiss id <-> metadata 매칭
        id_to_metadata = {}
        for row in metadata_raws:
            id_to_metadata[row[0]] = {
                "table_name": row[1],
                "original_column_name": row[2],
                "column_name": row[3],
                "column_description": row[4],
                "value_description": row[5],
                "index_text": row[6],
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

        exec_logger.debug(f"Batch search completed: {len(queries)} queries processed")

        all_table_descriptions = []
        for relevant_docs_score in final_results:
            table_description = {}
            for metadata, score in relevant_docs_score:
                table_name = metadata["table_name"]
                original_column_name = metadata["original_column_name"].strip()
                column_name = metadata["column_name"].strip()
                column_description = metadata["column_description"].strip()
                value_description = metadata["value_description"].strip()

                if table_name not in table_description:
                    table_description[table_name] = {}

                if original_column_name not in table_description[table_name]:
                    table_description[table_name][original_column_name] = {
                        "column_name": column_name,
                        "column_description": column_description,
                        "value_description": value_description,
                        "score": score,
                    }
            all_table_descriptions.append(table_description)

        return all_table_descriptions

    def status(self) -> bool:
        try:
            return bool(self.db_reader and self.vector_db_reader)
        except Exception as e:
            exec_logger.debug(f"Cannot Connect DB.")
            return False
    
    def _get_metadata_by_ids(self, all_faiss_ids:List) -> Any:
        placeholders = ','.join(['?'] * len(all_faiss_ids))
        result = self.db_reader.query(
            SQL.FAISS_SCHEMA_SEARCH_METADATA_BY_IDS.format(placeholders=placeholders), 
            params=list(all_faiss_ids))
        
        return result
        