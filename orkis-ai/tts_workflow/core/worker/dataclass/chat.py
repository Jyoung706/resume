from typing import Dict
from pydantic import BaseModel, field_serializer, field_validator
from langchain_core.messages import AnyMessage
from langchain.schema import messages_to_dict, messages_from_dict

class Chat(BaseModel):
    work_name: str
    message: AnyMessage

    @field_serializer("message", return_type=Dict)
    def serialize_message(self, message: AnyMessage) -> Dict:
        return messages_to_dict([message])[0]

    @field_validator("message", mode="before")
    def deserialize_message(cls, value: Dict | AnyMessage) -> AnyMessage:
        if isinstance(value, dict) and "type" in value:
            return messages_from_dict([value])[0]
        return value
