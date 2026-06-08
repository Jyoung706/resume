"""Preprocess DTOs - Pydantic request models.

backend `RagPreprocessingService.sendAllPreprocessingRequest` 의 payload 와 매칭 (snake_case).
"""
from typing import Optional

from pydantic import BaseModel


class PreprocessStartRequest(BaseModel):
    db_id: str
    user_id: str
    type: int = 0  # 0=ALL, 1=SCHEMA, 2=DATA
    db_type: int = 3  # SQLite
    api_key: Optional[str] = None


class PreprocessSampleRequest(BaseModel):
    """backend `RagPreprocessingService.callSamplePreprocessApi` 의 payload (db_id 만)."""

    db_id: str
