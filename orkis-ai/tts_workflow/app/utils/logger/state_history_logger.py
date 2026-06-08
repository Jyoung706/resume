import logging

from tts_workflow.app.utils.logger.handler.async_log_handler import AsyncLogHandler
from tts_workflow.app.utils.logger.exec_logger import _logger_id, _work_name_context
from tts_workflow.core.utils.logger import Logger


class StateHistoryLogger(Logger):
    def _add_handler(self):
        super()._add_handler()

        # 비동기 파일 핸들러 (LogActor로 전달)
        file_formatter = logging.Formatter(self.format_str, "%y-%m-%d|%H:%M:%S")
        async_handler = AsyncLogHandler(_logger_id, _work_name_context)
        async_handler.setFormatter(file_formatter)
        self._logger.addHandler(async_handler)


state_history_logger = StateHistoryLogger("state_history_logger")
