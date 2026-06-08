# tts_workflow/core/vector_search/executor/env_schema.py
"""
Executor Environment Schemas

TypedDict 기반 Executor 입력 계약 정의
- 각 Executor는 __env_schema__로 필요한 env 타입 선언
- Pool Key 및 Executor 생성 시 스키마 기반 필터링
"""

from typing import TypedDict

from tts_workflow.core.vector_search.constants import INDEX_TYPE


class DBEnv(TypedDict):
    db_id: str

class OpenaiAPIEnv(TypedDict):
    api_key: str

class DBPathEnv(DBEnv):
    path: str

class FaissEnv(DBPathEnv):
    index_type: INDEX_TYPE

class FileEnv(DBEnv):
    file_name: str