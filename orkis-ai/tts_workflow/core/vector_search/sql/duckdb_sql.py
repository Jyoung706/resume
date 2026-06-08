"""
DuckDB SQL Templates

사용법:
    from tts_workflow.core.vector_search.sql.duckdb_sql import SQL

    sql = SQL.TABLE_INFO.format(table_name="users")
    sql = SQL.DISTINCT_VALUES.format(table_name="users", column_name="age")
"""


class SQL:
    """DuckDB SQL 템플릿 모음"""

    # === PRAGMA ===

    # === SELECT ===
    FAISS_SCHEMA_SEARCH_METADATA_BY_IDS = """
        SELECT
            faiss_id,
            table_name,
            original_column_name,
            column_name,
            column_description,
            value_description,
            index_text
        FROM column_semantic_docs
        WHERE faiss_id IN ({placeholders})
    """

    FAISS_DATA_SEARCH_METADATA_BY_IDS = """
        SELECT
            faiss_id,
            table_name,
            column_name,
            index_text
        FROM entity_docs
        WHERE faiss_id IN ({placeholders})
    """

    # === Insert ===
    INSERT_FAISS_SCHEMA_VALUES= "INSERT INTO column_semantic_docs VALUES (?, ?, ?, ?, ?, ?, ?)"
    INSERT_FAISS_DATA_VALUES= "INSERT INTO entity_docs (faiss_id, table_name, column_name, index_text) VALUES (?, ?, ?, ?)"
    
    # === CREATE ===
    CREATE_FAISS_SCHEMA_TABLE = """
        CREATE TABLE IF NOT EXISTS column_semantic_docs (
            faiss_id BIGINT PRIMARY KEY,
            index_text TEXT NOT NULL,
            table_name TEXT NOT NULL,
            original_column_name TEXT NOT NULL,
            column_name TEXT,
            column_description TEXT,
            value_description TEXT
        )
    """

    CREATE_FAISS_DATA_TABLE = """
        CREATE TABLE IF NOT EXISTS entity_docs (
            faiss_id BIGINT PRIMARY KEY,
            table_name TEXT NOT NULL,
            column_name TEXT NOT NULL,
            index_text TEXT NOT NULL
        )
    """