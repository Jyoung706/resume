from pydantic_settings import BaseSettings
import os
from pathlib import Path
from typing import List
from tts_workflow.core.conf.logger_conf.logger_config import LoggerConfig


class Config(BaseSettings):
    LOG_CONFIG_PATH: Path = Path("")
    WORKER_CONFIG_DIR: Path = Path("")
    BASIC_WORKER_PATH: Path = Path("")
    DB_ROOT_PATH: Path = Path("")
    TEMPLATES_ROOT_PATH: Path = Path("")
    DB_SOURCE_ASSETS: List[str] = []


class DevConfig(Config):
    LOG_CONFIG_PATH: Path = Path(os.getenv("LOG_CONFIG_PATH"))
    WORKER_CONFIG_DIR: Path = Path(os.getenv("WORKER_CONFIG_DIR"))
    BASIC_WORKER_PATH: Path = Path(os.getenv("BASIC_WORKER_PATH"))
    DB_ROOT_PATH: Path = Path(os.getenv("DB_ROOT_PATH"))
    DB_NETWORK_PATH: Path = Path(os.getenv("DB_NETWORK_PATH"))
    TEMPLATES_ROOT_PATH: Path = Path(os.getenv("TEMPLATES_ROOT_PATH"))
    EMBEDDING_FUNCTION_MODEL: str = os.getenv("EMBEDDING_FUNCTION_MODEL")
    CHAT_CONTEXT_DIR: Path = Path(os.getenv("CHAT_CONTEXT_DIR"))
    CHAT_SUMMARY_DIR: Path = Path(os.getenv("CHAT_SUMMARY_DIR"))
    TITLE_CONFIG_PATH: Path = Path(os.getenv("TITLE_CONFIG_PATH"))
    SUMMARY_CONFIG_PATH: Path = Path(os.getenv("SUMMARY_CONFIG_PATH"))
    LOG:str = os.getenv("LOG")
    DEALLOC_INTERVAL: int = int(os.getenv("DEALLOC_INTERVAL", "10"))
    # 전처리 진입 시 NAS → Local 로 동기화할 원본 자산 상대 경로 목록.
    # `{db_name}` placeholder 는 sync_from_nas 에서 Path(db_id).name 으로 치환.
    DB_SOURCE_ASSETS: List[str] = [
        s.strip()
        for s in os.getenv(
            "DB_SOURCE_ASSETS", "{db_name}.sqlite,database_description"
        ).split(",")
        if s.strip()
    ]


config = DevConfig()
logger_config = LoggerConfig.load_config(LOG_CONFIG_PATH=config.LOG_CONFIG_PATH, log_level=config.LOG)
