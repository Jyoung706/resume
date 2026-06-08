

from enum import IntEnum, unique

@unique
class RAG_TYPE(IntEnum):
    ALL=0
    SCHEMA=1
    DATA=2

@unique
class DB_TYPE(IntEnum):
    """
    supply Database type enum
    """
    """FILE"""
    FILE_PICKLE = 0
    FILE_CSV    = 1
    FILE_JSON   = 2
    """RDB"""
    SQLITE      = 3
    MYSQL       = 4
    DUCKDB      = 8
    """VectorDB"""
    CHROMA      = 5
    FAISS       = 6
    NEO4J       = 7
    FAISS_DATA       = 9

@unique
class RAG_STAT(IntEnum):
    SUCCESS=0
    ERROR=1
    RUNNING=2
