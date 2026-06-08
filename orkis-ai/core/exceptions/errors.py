from dataclasses import dataclass
from typing import Optional
from http import HTTPStatus

from pydantic import BaseModel


class Error(BaseModel):
    code: str
    message: str
    http_status: int = 500

    def format(self, **kwargs) -> "Error":
        """메시지 포맷팅 후 새로운 객체 반환"""
        return Error(
            code=self.code,
            message=self.message.format(**kwargs),
            http_status=self.http_status,
        )

    def format_msg(self, **kwargs) -> str:
        """메시지 포맷팅"""
        return self.message.format(**kwargs)


class Errors:
    # COMMON Errors
    SERVER_ERROR = Error(
        code="SYSTEM_001",
        message="내부 서버 오류가 발생했습니다.",
        http_status=HTTPStatus.INTERNAL_SERVER_ERROR,
    )

    # VALIDATION Errors
    MISSING_FIELD = Error(
        code="VALIDATION_001",
        message="필수 필드가 누락되었습니다. (field: {field})",
        http_status=HTTPStatus.BAD_REQUEST,
    )
    INVALID_FORMAT = Error(
        code="VALIDATION_002",
        message="잘못된 데이터 형식입니다. (field: {field}, valid type: {valid_type}, input_type: {input_type}, input: {input})",
        http_status=HTTPStatus.BAD_REQUEST,
    )
    INVALID_OPTION_VALUE = Error(
        code="VALIDATION_003",
        message="잘못된 옵션값 입니다. (field: {field}, enable: {value})",
        http_status=HTTPStatus.BAD_REQUEST,
    )
    MISSING_OPTIONAL_FIELD = Error(
        code="VALIDATION_004",
        message="{field1} 필드는 {field2}:{value} 일 경우 필수 필드 입니다.",
        http_status=HTTPStatus.BAD_REQUEST,
    )
    INVALID_NOT_KNOWN = Error(
        code="VALIDATION_999",
        message="알수 없는 검증 오류 입니다.",
        http_status=HTTPStatus.BAD_REQUEST,
    )

    # CHAT Errors
    TASK_INITIALIZATION_FAILED = Error(
        code="CHAT_001",
        message="작업 초기화에 실패했습니다. ({hint})",
        http_status=HTTPStatus.INTERNAL_SERVER_ERROR,
    )
    TITLE_GENRATE_FAILED = Error(
        code="CHAT_002",
        message="TITLE 생성에 실패했습니다.",
        http_status=HTTPStatus.INTERNAL_SERVER_ERROR,
    )
    CHAT_EXECUTE_FAILED = Error(
        code="CHAT_003",
        message="대화 실행에 실패했습니다.",
        http_status=HTTPStatus.INTERNAL_SERVER_ERROR,
    )
    CHAT_CANCLE_FAILED = Error(
        code="CHAT_004",
        message="대화 취소에 실패했습니다.",
        http_status=HTTPStatus.INTERNAL_SERVER_ERROR,
    )

    # Preprocess Errors
    PREPROCESSING_FAILED = Error(
        code="PREPROCESS_001",
        message="RAG DB 생성에 실패 했습니다.",
        http_status=HTTPStatus.INTERNAL_SERVER_ERROR,
    )

    PREPROCESSING_STATUS_FAILED = Error(
        code="PREPROCESS_002",
        message="RAG DB 상태 조회에 실패 했습니다.",
        http_status=HTTPStatus.INTERNAL_SERVER_ERROR,
    )

    DATABASE_NOT_FOUND = Error(
        code="PREPROCESS_003",
        message="데이터베이스 파일을 찾을 수 없습니다. (db_id: {db_id})",
        http_status=HTTPStatus.NOT_FOUND,
    )

    PREPROCESSING_SAMPLE_FAILED = Error(
        code="PREPROCESS_004",
        message="RAG DB 샘플 생성에 실패 했습니다.",
        http_status=HTTPStatus.INTERNAL_SERVER_ERROR,
    )