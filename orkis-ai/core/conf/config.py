from typing import Optional
from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings
from ..static.LogEnums import LOG_LEVEL
import os


class Config(BaseSettings):
    APP_NAME: str = "default"
    APP_DESC: str = ""
    APP_VER: str = "0.0.0"
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000
    APP_DOC_URL: str = "/docs"
    APP_REDOC_URL: str = "/redoc"
    LOG: int = 20
    ENV: Optional[str] = Field(default="dev")
    DB_TYPE: Optional[str] = None
    DB_NAME: Optional[str] = None
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[str] = None
    DB_USER_ID: Optional[str] = None
    DB_USER_PASSWORD: Optional[str] = None
    DB_URL: Optional[str] = None

    # Chess Config
    DB_ROOT_PATH: str = ""
    CONFIG_PATH: str = ""


class ProdConfig(Config):
    __setattr__ = object.__setattr__

    def __init__(self):
        self.APP_NAME = os.getenv("APP_NAME")
        self.APP_DESC = os.getenv("APP_DESC")
        self.APP_VER = os.getenv("APP_VER")
        self.APP_DOC_URL = os.getenv("APP_DOC_URL")
        self.APP_REDOC_URL = os.getenv("APP_REDOC_URL")
        self.APP_HOST = os.getenv("APP_HOST")
        self.APP_PORT = int(os.getenv("APP_PORT"))

        self.LOG: int = LOG_LEVEL[os.getenv("LOG")].value
        self.ENV: str = os.getenv("ENV", "dev")
        self.DB_ROOT_PATH: str = os.getenv("DB_ROOT_PATH")
        self.CONFIG_PATH: str = os.getenv("CONFIG_PATH")
        self.USE_STANDARD_HTTP_CODES: bool = (
            os.getenv("USE_STANDARD_HTTP_CODES", "False").lower() == "true"
        )

class RedisChatConfig(Config):
    __setattr__ = object.__setattr__

    def __init__(self):
        self.HOST: str = os.getenv("REDIS_CHAT_HOST", "localhost")
        self.PORT: int = int(os.getenv("REDIS_CHAT_PORT", "6379"))
        self.DB_ID: int = int(os.getenv("REDIS_CHAT_DB_ID", "0"))
        self.DECODE_RES: bool = (
            os.getenv("REDIS_CHAT_DECODE_RES", "true").lower() == "true"
        )

        # ACONNECTION POOL 설정
        self.MAX_CON: int = int(os.getenv("REDIS_CHAT_MAX_CON", "10"))
        self.RETRY_ON_TIMEOUT: bool = (
            os.getenv("REDIS_CHAT_RETRY_ON_TIMEOUT", "false").lower() == "true"
        )
        self.TIMEOUT: int = int(os.getenv("REDIS_CHAT_TIMEOUT", "1"))


class RedisStageConfig(Config):
    __setattr__ = object.__setattr__

    def __init__(self):
        self.HOST: str = os.getenv("REDIS_STAGE_HOST", "localhost")
        self.PORT: int = int(os.getenv("REDIS_STAGE_PORT", "6379"))
        self.DB_ID: int = int(os.getenv("REDIS_STAGE_DB_ID", "0"))
        self.DECODE_RES: bool = (
            os.getenv("REDIS_STAGE_DECODE_RES", "true").lower() == "true"
        )

        # ACONNECTION POOL 설정
        self.MAX_CON: int = int(os.getenv("REDIS_STAGE_MAX_CON", "10"))
        self.RETRY_ON_TIMEOUT: bool = (
            os.getenv("REDIS_STAGE_RETRY_ON_TIMEOUT", "false").lower() == "true"
        )
        self.TIMEOUT: int = int(os.getenv("REDIS_STAGE_TIMEOUT", "1"))


config: Config = ProdConfig()

redisChatConfig: Config = RedisChatConfig()
redisStageConfig: Config = RedisStageConfig()
