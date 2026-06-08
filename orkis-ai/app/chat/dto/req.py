from typing import List, Dict
from core.dto.base_request import ResultRequest
from core.static.llm_model_enum import MODELS


class ConversationRequest(ResultRequest):
    chatroom_id: str
    chat_id: str = None
    question: str
    db_id: str
    evidence: str = ""
    topics: List[str] = ["ALL"]
    worker_id: str = "it_ir_ss_cg_ut"
    llm_model: MODELS
    api_key: str
    selected_schema:Dict[str, List] = {}
    generate_title: bool = False

    # @model_validator(mode="after")
    # def validate_conditional_fields(self) -> "ConversationRequest":
    #     # 조건부 검증
    #     if self.llm_model != "basic":
    #         if not self.api_key or not self.api_key.strip():
    #             raise ValidationException(error=Errors.MISSING_FIELD, field="api_key")

    #     return self


class CancleRequest(ResultRequest):
    chat_id: str
