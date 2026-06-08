from typing import Any, Dict, List

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.executor.duckdb_writer import DuckDBWriter
from tts_workflow.app.vector_search.executor.faiss_reader import FaissReader
from tts_workflow.app.vector_search.executor.duckdb_reader import DuckDBReader
from tts_workflow.app.vector_search.executor.faiss_writer import FaissWriter
from tts_workflow.app.vector_search.executor.minhash_vectorizer import MinhashVectorizer
from tts_workflow.app.vector_search.repository.faiss_data_repository import FaissDataRepository
from tts_workflow.core.vector_search.constants import INDEX_TYPE
from tts_workflow.core.vector_search.executor.config import ExecutorConfig
from tts_workflow.core.vector_search.sql.duckdb_sql import SQL


class FaissLSHDataRepository(FaissDataRepository):
    embedding_model= ExecutorConfig(MinhashVectorizer)
    db_reader= ExecutorConfig(DuckDBReader, path="data_vector_db_lsh")
    db_writer= ExecutorConfig(DuckDBWriter, path="data_vector_db_lsh")
    vector_db_reader= ExecutorConfig(FaissReader, path="data_vector_db_lsh", index_type=INDEX_TYPE.LSH)
    vector_db_writer= ExecutorConfig(FaissWriter, path="data_vector_db_lsh", index_type=INDEX_TYPE.LSH)

    def embedding(self, data:Any, **kwargs) -> Any:
        return self.embedding_model.embedding(data)