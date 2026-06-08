from typing import Optional
from core.dto.base_response import ResultResponse


class ConversationResponse(ResultResponse):
    chat_id: str
    title: Optional[str]
