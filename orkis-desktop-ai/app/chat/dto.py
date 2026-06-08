"""Chat DTOs - Pydantic request models."""
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ChatStartRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    chatId: str
    sessionId: str
    content: str
    modelId: str = "gpt-4o"
    apiKey: Optional[str] = None
    workerId: Optional[str] = None
    dbId: Optional[str] = None
    generateTitle: bool = False


class ChatCancelRequest(BaseModel):
    chatId: str
