from pydantic import BaseModel
from typing import List

from core.dto.base_response import ResultResponse
from core.static.rag_enum import RAG_STAT

class PreProccessStatus(BaseModel):
    status: RAG_STAT

class PreProccessBatch(BaseModel):
    success: bool
    db_id: str

class PreProccessBatchResonse(ResultResponse):
    result: List[PreProccessBatch]
