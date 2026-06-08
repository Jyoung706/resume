from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings
from ..static.LogEnums import LOG_LEVEL
import os

class Config(BaseSettings):
    APP_NAME: str = "default"
    APP_DESC: str = ""
    APP_VER: str = "0.0.0"
    LOG: int = 20
    ENV: Optional[str] = Field(default="dev")
    DB_TYPE: Optional[str] = None
    DB_NAME: Optional[str] = None
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[str] = None
    DB_USER_ID: Optional[str] = None
    DB_USER_PASSWORD: Optional[str] = None
    DB_URL: Optional[str] = None

    DB_ROOT_PATH: str = ""
    CONFIG_PATH: str = ""


class ProdConfig(Config):
    __setattr__ = object.__setattr__

    def __init__(self):
        self.APP_NAME = os.getenv("APP_NAME")
        self.APP_DESC = os.getenv("APP_DESC")
        self.APP_VER = os.getenv("APP_VER")

        self.LOG: int = LOG_LEVEL[os.getenv("LOG")].value
        self.ENV: str = os.getenv("ENV", "dev")
        self.DB_ROOT_PATH: str = os.getenv("DB_ROOT_PATH")
        self.CONFIG_PATH: str = os.getenv("CONFIG_PATH")


config: Config = ProdConfig()
