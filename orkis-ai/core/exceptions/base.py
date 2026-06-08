from http import HTTPStatus
from typing import Optional

from core.exceptions.errors import Error


class BaseException(Exception):
    def __init__(self, error: Error, **kwargs):
        self.code = error.code
        self.http_status = error.http_status

        if not kwargs:
            self.message = error.message
        else:
            self.message = error.format_msg(**kwargs)

        super().__init__(self.message)


class APIException(BaseException):
    """API 예외 클래스"""

    def __init__(self, error: Error, **kwargs):
        super().__init__(error, **kwargs)


class ValidationException(BaseException):
    """검증 예외 클래스"""

    def __init__(self, error: Error, **kwargs):
        super().__init__(error, **kwargs)


# 일단 미사용
# class CustomException(Exception):
#     code = HTTPStatus.BAD_GATEWAY
#     error_code = HTTPStatus.BAD_GATEWAY
#     message = HTTPStatus.BAD_GATEWAY.description

#     def __init__(self, message=None):
#         if message:
#             self.message = message

# class BadRequestException(CustomException):
#     code = HTTPStatus.BAD_REQUEST
#     error_code = HTTPStatus.BAD_REQUEST
#     message = HTTPStatus.BAD_REQUEST.description

# class NotFoundException(CustomException):
#     code = HTTPStatus.NOT_FOUND
#     error_code = HTTPStatus.NOT_FOUND
#     message = HTTPStatus.NOT_FOUND.description

# class ForbiddenException(CustomException):
#     code = HTTPStatus.FORBIDDEN
#     error_code = HTTPStatus.FORBIDDEN
#     message = HTTPStatus.FORBIDDEN.description

# class UnauthorizedException(CustomException):
#     code = HTTPStatus.UNAUTHORIZED
#     error_code = HTTPStatus.UNAUTHORIZED
#     message = HTTPStatus.UNAUTHORIZED.description

# class UnprocessableEntity(CustomException):
#     code = HTTPStatus.UNPROCESSABLE_ENTITY
#     error_code = HTTPStatus.UNPROCESSABLE_ENTITY
#     message = HTTPStatus.UNPROCESSABLE_ENTITY.description

# class DuplicateValueException(CustomException):
#     code = HTTPStatus.UNPROCESSABLE_ENTITY
#     error_code = HTTPStatus.UNPROCESSABLE_ENTITY
#     message = HTTPStatus.UNPROCESSABLE_ENTITY.description
