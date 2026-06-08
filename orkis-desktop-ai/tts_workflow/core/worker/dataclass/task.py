
from typing import List, Optional, Dict
from pydantic import BaseModel

from core.static.rag_enum import RAG_TYPE, DB_TYPE
from core.static.llm_model_enum import MODELS


class ConversationTask(BaseModel):
    chatroom_id: str
    question: str
    db_id: str
    evidence: Optional[str] = ""
    topics: Optional[List[str]] = []
    worker_id: str
    llm_model: MODELS
    api_key: str
    chat_id: str
    input: Dict

class PreprocessTask(BaseModel):
    type:RAG_TYPE = RAG_TYPE.SCHEMA
    db_id: str
    db_type:DB_TYPE = DB_TYPE.SQLITE
    api_key: str

class PreprocessStatusTask(BaseModel):
    type:RAG_TYPE = RAG_TYPE.SCHEMA
    db_id: str