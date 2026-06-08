from abc import ABC
from threading import Lock
import logging

from tts_workflow.core.conf.config import logger_config


# REDIS 혹은 DB 붙일때 CUSTOM HANDLER 추가 하기
class Logger(ABC):
    _instance = None
    _lock = Lock()

    def __new__(cls, logger_name: str = None):
        with cls._lock:
            if logger_name is not None and cls._instance is None:
                cls._instance = super(Logger, cls).__new__(cls)
                cls._instance._init(logger_name)

            if cls._instance is None:
                raise ValueError("Logger instance has not been initialized.")
        return cls._instance

    def _init(self, logger_name: str):
        self.logger_name = logger_name
        self.format_str = f"[%(levelname)s] [%(asctime)s.%(msecs)05.0f] %(message)s"
        self._conf = logger_config.logger_infos[logger_name]
        self._logger = logging.getLogger(logger_name)

        self._set_log_level()
        self._add_handler()
        self._logger.propagate = False

    def _set_log_level(self):
        log_level_attr = getattr(logging, self._conf.log_level.upper(), None)
        if log_level_attr is None:
            raise ValueError(f"Invalid log level: {self._conf.log_level}")
        self._logger.setLevel(log_level_attr)

    def _add_handler(self):
        stream_formatter = logging.Formatter(
            f"[{self.logger_name}] " + self.format_str, "%y-%m-%d|%H:%M:%S"
        )
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(stream_formatter)
        self._logger.addHandler(stream_handler)

        # CUSTOM HANDLER 추가

    def info(self, msg: str):
        self._logger.info(msg)

    def debug(self, msg: str):
        self._logger.debug(msg)

    def warning(self, msg: str):
        self._logger.warning(msg)

    def error(self, msg: str):
        self._logger.error(msg)

    def critical(self, msg: str):
        self._logger.critical(msg)
