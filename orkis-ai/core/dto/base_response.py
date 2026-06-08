from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from abc import ABC


class ResultResponse(BaseModel, ABC):
    pass


class NoneDataResponse(ResultResponse):
    pass


class ErrorResponse(BaseModel):
    code: str
    message: str


class BaseResponse(BaseModel):
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[ErrorResponse] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
