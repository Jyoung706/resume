from pydantic import BaseModel
from typing import Dict
import yaml
import os


class LoggerInfo(BaseModel):
    log_level: str
    root_save_dir: str = None
    save_fn: str = None


class LoggerConfig(BaseModel):
    logger_infos: Dict[str, LoggerInfo]

    @classmethod
    def load_config(cls, LOG_CONFIG_PATH: str, log_level:str = "INFO"):
        with open(LOG_CONFIG_PATH, "r", encoding="UTF8") as file:
            config = yaml.safe_load(file)

        logger_infos = {}
        for logger_name, logger_info in config.items():
            logger_info["log_level"] = log_level
            logger_infos[logger_name] = LoggerInfo(**logger_info)

        return cls(logger_infos=logger_infos)
