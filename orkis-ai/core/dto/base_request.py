from pydantic import BaseModel, model_validator

from core.exceptions.base import ValidationException
from core.exceptions.errors import Errors


class ResultRequest(BaseModel):
    @model_validator(mode="after")
    def validate_required_strings(self):
        """필수 문자열 필드 자동 검증"""
        # 클래스의 모든 필드 정보 가져오기
        for field_name, field_info in self.__class__.model_fields.items():
            # 필드 타입이 str이고 default가 없는 경우
            if field_info.annotation == str and field_info.is_required():
                value = getattr(self, field_name)
                if not value or not value.strip():
                    raise ValidationException(
                        error=Errors.MISSING_FIELD, field=field_name
                    )
                # 자동 strip
                setattr(self, field_name, value.strip())

        return self
