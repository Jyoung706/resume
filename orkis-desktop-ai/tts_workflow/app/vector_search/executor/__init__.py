__all__ = [
    "SqliteReader",
    "CsvReader",
    "DuckDBReader",
    "DuckDBWriter",
    "FaissReader",
    "FaissWriter",
    "MinhashVectorizer",
    "OpenAIVectorizer",
]


def __getattr__(name):
    if name == "SqliteReader":
        from tts_workflow.app.vector_search.executor.sqlite_reader import SqliteReader
        return SqliteReader
    elif name == "CsvReader":
        from tts_workflow.app.vector_search.executor.csv_reader import CsvReader
        return CsvReader
    elif name == "DuckDBReader":
        from tts_workflow.app.vector_search.executor.duckdb_reader import DuckDBReader
        return DuckDBReader
    elif name == "DuckDBWriter":
        from tts_workflow.app.vector_search.executor.duckdb_writer import DuckDBWriter
        return DuckDBWriter
    elif name == "FaissReader":
        from tts_workflow.app.vector_search.executor.faiss_reader import FaissReader
        return FaissReader
    elif name == "FaissWriter":
        from tts_workflow.app.vector_search.executor.faiss_writer import FaissWriter
        return FaissWriter
    elif name == "MinhashVectorizer":
        from tts_workflow.app.vector_search.executor.minhash_vectorizer import MinhashVectorizer
        return MinhashVectorizer
    elif name == "OpenAIVectorizer":
        from tts_workflow.app.vector_search.executor.openai_vectorizer import OpenAIVectorizer
        return OpenAIVectorizer
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
