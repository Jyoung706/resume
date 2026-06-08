from pydantic import BaseModel
from typing import List


class PreProccessRequest(BaseModel):
    db_id_list: List[str]
