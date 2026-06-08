from pydantic import BaseModel
from typing import List


class CancleRequest(BaseModel):
    chat_id: str
