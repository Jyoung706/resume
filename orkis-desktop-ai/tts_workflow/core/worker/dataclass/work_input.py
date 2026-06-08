from typing import Any, Dict, Optional
from pydantic import BaseModel


class WorkInput(BaseModel):
    """Work 설정 기본 클래스"""
    work_name: str
    proc_id: Optional[int] = None
    streaming: Optional[bool]
