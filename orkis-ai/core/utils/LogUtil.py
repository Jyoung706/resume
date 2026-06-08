from ..conf import config
from ..static.LogEnums import LOG_LEVEL
import logging
import inspect

# https://hwangheek.github.io/2019/python-logging/ --> logging class help

# 로그 설정
# logging.basicConfig(level=config.LOG)
# logger = logging.getLogger()
logger = logging.getLogger(config.APP_NAME)
logger.setLevel(config.LOG)

logFormatter = logging.Formatter(
    f"\033[32m%(levelname)s\033[0m [%(asctime)s]: %(message)s", "%y-%m-%d|%H:%M:%S"
)

# file log Handler for file log
# file_hdl = logging.FileHandler(full_path)
# file_hdl.setFormatter(formatter)
# logger.addHandler(file_hdl)

# console log Handler
console_hdl = logging.StreamHandler()
console_hdl.setFormatter(logFormatter)
logger.addHandler(console_hdl)
logger.propagate = False

systemLogger = logging.getLogger(config.APP_NAME + "_system")
systemLogger.setLevel(config.LOG)

# console log Handler
console_hd2 = logging.StreamHandler()
console_hd2.setFormatter(logging.Formatter(f"%(message)s"))
systemLogger.addHandler(console_hd2)
systemLogger.propagate = False
import os


class LogUtil:
    @staticmethod
    def systemLog(text):
        systemLogger.log(LOG_LEVEL.INFO, text)

    @staticmethod
    def info(*args):
        logger.log(LOG_LEVEL.INFO, *args)

    @staticmethod
    def debug(*args):
        if config:
            logger.log(LOG_LEVEL.DEBUG, *args)

    @staticmethod
    def error(*args):
        filename, line_number, function_name, lines, index = inspect.getframeinfo(
            inspect.currentframe().f_back
        )
        error_string = (
            f"Error Trace File: [{filename}], Func:[{function_name}], Line:[{lines}]"
        )
        if config:
            logger.log(LOG_LEVEL.ERROR, error_string)
        logger.log(LOG_LEVEL.ERROR, *args)

    # if _debug and isinstance(e, KeyboardInterrupt):


# except KeyboardInterrupt:
#     if _debug:
#         sys.exit()
#     logging.exception("Normal handling")
# except Exception as e:
#     logging.exception("Normal handling")
# -----------------------------------------------------
# except Exception as e:
#     if _debug and isinstance(e, KeyboardInterrupt):
#         sys.exit()
#     logger.exception("Normal handling")
