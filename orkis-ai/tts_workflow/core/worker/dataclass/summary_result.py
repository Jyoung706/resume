from typing import Dict
from pydantic import BaseModel


class SummaryResult(BaseModel):
    success: bool = False
    q: str = None
    a: str = None
    sql: str = None
    steps: Dict = None
    last_step: int = None
    end_time: int = None