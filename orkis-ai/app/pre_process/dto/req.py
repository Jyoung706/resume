from typing import List

from pydantic import model_validator
from core.dto.base_request import ResultRequest
from core.exceptions.base import ValidationException
from core.exceptions.errors import Errors
from core.static.rag_enum import RAG_TYPE, DB_TYPE
# from tts_workflow.core.vector_search.registry import REPOSITORY_PROVIDER



class PreProccessRequest(ResultRequest):
    type:RAG_TYPE = RAG_TYPE.ALL
    db_type:DB_TYPE = DB_TYPE.SQLITE
    db_id: str
    api_key: str

    # [[[CHECK]]]
    # @model_validator(mode="after")
    # def validate_db_type(self) -> "PreProccessRequest":
    #     if self.db_type not in REPOSITORY_PROVIDER[REPO_TYPE.SOURCE_DB]:
    #         supported = list(REPOSITORY_PROVIDER[REPO_TYPE.SOURCE_DB].keys())
    #         raise ValidationException(
    #             error=Errors.INVALID_OPTION_VALUE,
    #             field="db_type",
    #             value=", ".join([f"{t.value}:{t.name}" for t in supported]),
    #         )
    #     return self

class PreProccessStatusRequest(ResultRequest):
    type:RAG_TYPE = RAG_TYPE.SCHEMA
    db_id: str
    
    @model_validator(mode="after")
    def validate_db_type(self) -> "PreProccessStatusRequest":
        if self.type == RAG_TYPE.ALL:
            raise ValidationException(
                error=Errors.INVALID_OPTION_VALUE,
                field="type",
                value=", ".join([f"{t.value}:{t.name}" for t in RAG_TYPE if t != RAG_TYPE.ALL]),
            )
        return self
    
class PreProccessBatchRequest(ResultRequest):
    db_id_list: List[str]
    api_key: str

class PreProccessSample(ResultRequest):
    db_id: str
