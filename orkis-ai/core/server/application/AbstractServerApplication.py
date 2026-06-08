from abc import *
from fastapi import FastAPI, Depends

from ...conf import config
from ...utils.DBLogger import DBLogger
from ...utils.LogUtil import LogUtil
from fastapi.middleware import Middleware
from typing import Any, List
from .LifeSpanHandler import lifeSpanHandler
from ...exceptions.Handlers import Handlers
from ...application.AbstractApplication import AbstractApplication

import uvicorn


class AbstractServerApplication(AbstractApplication):
    def __init__(
        self,
        title="",
        description="",
        version="",
        middlewares: List[Middleware] = [],
        host="127.0.0.1",
        port=8000,
        logLevel="debug",
        docs_url="/docs",
        redoc_url="/redoc",
        app_root: str = None,
        env_root: str = None,
        env: str = None,
    ):
        # self instance 로 세팅해도 되지 않을까? -> 너무 확장적이라 쓰기 힘듬
        super().__init__(app_root=app_root, env=env, env_root=env_root)

        self.title = title
        self.description = description
        self.version = version
        self.config = config
        self.env = env
        self.host = host
        self.port = port
        self.logLevel = logLevel

        def middlewareGen():
            return [
                # Middleware(
                #     CORSMiddleware,
                #     allow_origins=["*"],
                #     allow_credentials=True,
                #     allow_methods=["*"],
                #     allow_headers=["*"],
                #     expose_headers=["*"],
                # ),
                # Middleware(
                #     AuthenticationMiddleware,
                #     backend=AuthBackend(),
                #     on_error=on_auth_error,
                # ),
                *middlewares,
                # Middleware(ResponseLogMiddleware),
            ]

        self.app = FastAPI(
            title=title,
            description=description,
            version=version,
            # title="Beomik Ai Api Server",
            # description="Beomik Ai Api Server",
            # version="0.0.1",
            docs_url=None if config.ENV == "production" else "/docs",
            redoc_url=None if config.ENV == "production" else "/redoc",
            dependencies=[Depends(DBLogger)],
            middleware=middlewareGen(),
            lifespan=lifeSpanHandler,
        )

    @abstractmethod
    def addRouters(self):
        pass

    @abstractmethod
    def addListeners(self):
        pass

    @abstractmethod
    def beforeInitRoutersHandler(self):
        pass

    @abstractmethod
    def afterInitListenersHandler(self):
        pass

    @abstractmethod
    def serverStartedHandler(self):
        pass

    def exceptionHandler(self):
        for exec, handler in Handlers:
            self.app.add_exception_handler(
                exc_class_or_status_code=exec, handler=handler
            )

    def __call__(self):
        try:
            # self.addRouters()
            # self.addListeners()
            # self.exceptionHandler()

            # #set application context
            # self.app.context = self

            log_config = uvicorn.config.LOGGING_CONFIG
            log_config["loggers"]["uvicorn"]["handlers"] = []
            log_config["loggers"]["uvicorn.access"]["handlers"] = []
            # "loggers": {6
            #         "uvicorn": {"handlers": ["default"], "level": "INFO", "propagate": False},
            #         "uvicorn.error": {"level": "INFO"},
            #         "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
            #     },
            import os

            pid = os.getpid()
            print(f"fast api server pid: {pid}")

            uvicorn.run(
                app=self.app,
                host=self.host,
                port=self.port,
                log_level=self.logLevel,
                access_log=False,
                log_config=log_config,
            )
            # uvicorn.run(
            #     app="app.server:app",
            #     host=config.APP_HOST,
            #     port=config.APP_PORT,
            #     reload=True if config.ENV != "production" else False,
            #     workers=1,
            # )

        except Exception as e:
            LogUtil.error(e)
