from core.dto.base_response import BaseResponse, ErrorResponse
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import traceback

from core.exceptions.errors import Error, Errors

from .base import APIException, ValidationException
from ..utils.LogUtil import LogUtil as logger
from ..conf import config


async def get_warraped_response(
    http_status: int, code: str, message: str
) -> JSONResponse:
    return JSONResponse(
        status_code=200 if not config.USE_STANDARD_HTTP_CODES else http_status,
        content=BaseResponse(
            success=False, error=ErrorResponse(code=code, message=message)
        ).model_dump(),
    )


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """API 예외 처리"""
    logger.error(f"API Error occurred : {exc.message}")
    return await get_warraped_response(
        http_status=exc.http_status, code=exc.code, message=exc.message
    )


async def validation_exception_handler(
    request: Request, exc: ValidationException
) -> JSONResponse:
    """자체 검증 예외 처리"""
    logger.error(f"Validation Error occurred : {exc.message}")
    return await get_warraped_response(
        http_status=exc.http_status, code=exc.code, message=exc.message
    )


async def pydantic_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Pydantic 검증 예외 처리"""
    error = None
    # 일반 Pydantic 검증 오류 처리
    # 첫 번째 오류를 기준으로 처리
    if exc.errors():
        pydantic_error = exc.errors()[0]
        error_type = pydantic_error.get("type", "")
        field_path = ".".join(str(x) for x in pydantic_error["loc"][1:])

        if error_type == "missing":
            # 필수 필드 누락
            error = Errors.MISSING_FIELD.format(field=field_path)
        elif "_type" in error_type:
            # type 오류
            input = pydantic_error.get('input', None)
            error = Errors.INVALID_FORMAT.format(
                field=field_path, 
                valid_type=error_type,
                input_type = type(input),
                input = input
            )
        elif error_type == "literal_error" or error_type == "enum":
            # option value 오류
            error = Errors.INVALID_OPTION_VALUE.format(
                field=field_path, value=pydantic_error['ctx']['expected']
            )
        else:
            # 정의 되지 않음
            error = Errors.INVALID_NOT_KNOWN.format(field=field_path)

    if error is None:
        # 알 수 없음
        error = Errors.INVALID_NOT_KNOWN
    
    logger.error(f"Validation Error occurred : {error.model_dump()}")
    return await get_warraped_response(**error.model_dump())


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """일반 예외 처리"""
    details = {"type": type(exc).__name__, "trace": traceback.format_exc()}
    logger.error(f"Unexpected error occurred : {details}")

    error = Errors.SERVER_ERROR

    return await get_warraped_response(**error.model_dump())


Handlers = [
    (APIException, api_exception_handler),
    (RequestValidationError, pydantic_exception_handler),
    (ValidationException, validation_exception_handler),
    (Exception, general_exception_handler),
]
