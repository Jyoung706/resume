from pydantic import BaseModel
from typing import List


class ConversationRequest(BaseModel):
    chatroom_id: str
    question: str
    db_id: str
    generate_title: bool = False
    keywords: List[str] = ["ALL"]
    hint: str = ""
    worker_id: str = "it_ir_ss_cg_ut"
    llm_model: str
    # llm_model: str = "gpt-4o-mini"
