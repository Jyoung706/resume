from http import HTTPStatus
from typing import Optional

from core.exceptions.errors import Error


class WorkflowException(Exception):
    """워크플로우 예외의 베이스 클래스"""
    pass

class CriticalError(WorkflowException):
    """파이프라인을 즉시 중단해야 하는 치명적 오류"""
    pass

class WarningError(WorkflowException):
    """경고 수준의 오류 (파이프라인 계속 진행)"""
    pass

class CriticalError(WorkflowException):
    """파이프라인을 즉시 중단해야 하는 치명적 오류"""
    pass

class PreprocessNotCompleted(WorkflowException):
    """파이프라인을 즉시 중단해야 하는 치명적 오류"""
    pass

class LLMAPIError(CriticalError):
    pass

class RedisError(CriticalError):
    pass

class UnkownError(CriticalError):
    pass