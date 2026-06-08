"""
AsyncLogHandler (데스크탑 전용)

Ray LogActor 의존성 제거. 로그를 표준 Python logging으로 위임.
클래스를 유지하는 이유: exec_logger 등에서 isinstance 체크에 사용될 수 있음.
"""
import logging
from contextvars import ContextVar
from typing import Optional


class AsyncLogHandler(logging.Handler):
    """
    데스크탑 버전에서는 표준 StreamHandler로 대체.
    클래스 시그니처만 유지 (하위 호환).
    """

    def __init__(
        self,
        _logger_id: ContextVar[Optional[str]],
        work_name_context: ContextVar[Optional[str]],
    ):
        super().__init__()
        self._logger_id = _logger_id
        self._work_name_context = work_name_context

    def emit(self, record: logging.LogRecord) -> None:
        """표준 stderr로 출력 (Ray LogActor 대신)"""
        try:
            msg = self.format(record)
            logger_id = self._logger_id.get(None)
            work_name = self._work_name_context.get(None)
            prefix = ""
            if work_name:
                prefix += f"[{work_name}]"
            if logger_id:
                prefix += f"[{logger_id}]"
            if prefix:
                msg = f"{prefix} {msg}"
            print(msg)
        except Exception:
            self.handleError(record)
