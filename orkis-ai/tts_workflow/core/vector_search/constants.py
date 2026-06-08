# tts_workflow/core/vector_search/constants.py
"""
Vector Search 모듈 상수 정의

- ExecutionStatus: SQL 실행 상태
- Repository 인터페이스 목록 (Registry에서 사용)
"""

from enum import IntEnum, StrEnum


class ExecutionStatus(StrEnum):
    """SQL 실행 상태"""
    SYNTACTICALLY_CORRECT = "SYNTACTICALLY_CORRECT"
    EMPTY_RESULT = "EMPTY_RESULT"
    NONE_RESULT = "NONE_RESULT"
    ZERO_COUNT_RESULT = "ZERO_COUNT_RESULT"
    ALL_NONE_RESULT = "ALL_NONE_RESULT"
    SYNTACTICALLY_INCORRECT = "SYNTACTICALLY_INCORRECT"


class FetchType(StrEnum):
    """SQL 쿼리 fetch 타입"""
    ALL         = "all"
    ONE         = "one"
    RANDOM      = "random"
    INT         = "int" # not used code

class ENCODING_TYPE(StrEnum):
    """
    파일 인코딩 타입
    """
    UTF8_SIG   = "utf-8-sig"
    CP1252     = "cp1252"
    UTF8   = "utf-8"

# FAISS INDEX 생성 TYPE
class INDEX_TYPE(IntEnum):
    """
    파일 인코딩 타입
    """
    FLAT   = 0
    LSH    = 1