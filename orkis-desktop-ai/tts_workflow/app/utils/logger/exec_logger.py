import logging
from contextvars import ContextVar
from typing import Optional

from tts_workflow.app.utils.logger.handler.async_log_handler import AsyncLogHandler
from tts_workflow.core.utils.logger import Logger


# Context variable to store current chat_id
_logger_id: ContextVar[Optional[str]] = ContextVar('chat_id', default=None)
_work_name_context: ContextVar[Optional[str]] = ContextVar('work_name', default=None)


class ExecLogger(Logger):
    def _add_handler(self):
        super()._add_handler()

        # 비동기 파일 핸들러 (LogActor로 전달)
        file_formatter = logging.Formatter(self.format_str, "%y-%m-%d|%H:%M:%S")
        async_handler = AsyncLogHandler(_logger_id, _work_name_context)
        async_handler.setFormatter(file_formatter)
        self._logger.addHandler(async_handler)
    
    def _format_message(self, msg: str) -> str:
        prefix_msg = ""

        work_name = _work_name_context.get()
        if work_name:
            prefix_msg += f"[{work_name}] "

        chat_id = _logger_id.get()
        if chat_id:
            prefix_msg += f"[{chat_id}] "

        return prefix_msg + msg
    
    def info(self, msg: str):
        self._logger.info(self._format_message(msg))
    
    def debug(self, msg: str):
        self._logger.debug(self._format_message(msg))
    
    def warning(self, msg: str):
        self._logger.warning(self._format_message(msg))
    
    def error(self, msg: str):
        self._logger.error(self._format_message(msg))
    
    def critical(self, msg: str):
        self._logger.critical(self._format_message(msg))


exec_logger = ExecLogger("exec_logger")
