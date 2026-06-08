import logging
from pathlib import Path
from tts_workflow.app.utils.logger.handler.timed_rotating_file_handler import (
    TimedRotatingFileHandler,
)
from tts_workflow.core.utils.logger import Logger


class ChatHistoryLogger(Logger):
    def _add_handler(self):
        super()._add_handler()

        file_formatter = logging.Formatter(self.format_str, "%y-%m-%d|%H:%M:%S")
        file_handler = TimedRotatingFileHandler(
            Path(self._conf.root_save_dir), self._conf.save_fn
        )
        file_handler.setFormatter(file_formatter)
        self._logger.addHandler(file_handler)


chat_history_logger = ChatHistoryLogger("chat_history_logger")
