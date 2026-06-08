from contextlib import asynccontextmanager
from fastapi import FastAPI
from core.conf import config
from ...utils.LogUtil import LogUtil
from ...utils.ConsoleUtil import ConsoleUtil
from ...static.ConsoleEnums import ConsoleTextColor
import logging
import time
import os


# generator 함수를 비동기 context manager 로 변환하고, yeild 이전이 async with 문의 __aenter__ 이고, yield 이후가 __aexit__ 이다.
@asynccontextmanager
async def lifeSpanHandler(app: FastAPI):
    """
    FastAPI application context event Handler 개념
    app.state.super_secret = 'secretcode' -> 이렇게 넣으면 request에서 request.app.state.super_secret 로 가져다 쓸 수 있음
    1. yield 이전이 before start
    2. 이후가 shutdonw
    """
    # When service starts.

    # disable uvicorn logs
    # logging.getLogger("uvicorn.error").handlers = []
    # logging.getLogger("uvicorn.error").propagate = False

    logging.getLogger("uvicorn.access").handlers = []
    logging.getLogger("uvicorn.access").propagate = False

    # logging.getLogger("uvicorn.asgi").handlers = []
    # logging.getLogger("uvicorn.asgi").propagate = True

    applicationTitle = app.context.title
    description = app.context.description
    pid = os.getpid()
    version = app.context.version
    host = app.context.host
    port = app.context.port

    LogUtil.systemLog(
        ConsoleUtil.colorTextGen(
            """

         |=========================================================|
        """,
            color=ConsoleTextColor.brite_black,
        )
        + f""" |         {ConsoleUtil.colorTextGen(applicationTitle, color=ConsoleTextColor.brite_cyan)} {ConsoleUtil.colorTextGen(version, color=ConsoleTextColor.brite_magenta)}                          |
        """
        + f""" |          - {ConsoleUtil.colorTextGen(description, color=ConsoleTextColor.brite_blue)}      |
        """
        + f""" |          - WORKER PID: {ConsoleUtil.colorTextGen(pid, color=ConsoleTextColor.brite_green)}      |
        """
        + ConsoleUtil.colorTextGen(
            """ |=========================================================|
        """,
            color=ConsoleTextColor.brite_black,
        )
        + f"""   Server started {time.strftime('"%y-%m-%d %H:%M:%S"', time.localtime())}  << Host:{ConsoleUtil.colorTextGen(host, color=ConsoleTextColor.green)} Port:{ConsoleUtil.colorTextGen(port, color=ConsoleTextColor.brite_yellow)} >>"""
    )

    # server started abstract function
    app.context.serverStartedHandler()

    yield  # ganerator 반환

    # schedule_check_deadlocks_task.cancel()

    # When service is stopped.
    # shutdown()
