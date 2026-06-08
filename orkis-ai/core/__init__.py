from fastapi import APIRouter
from .conf import *
from .server import *
from .exceptions import *
from .static import *
from .utils import *
from .utils.LogUtil import LogUtil as logger

from .server.router.EndpointWrappingRouter import EndpointWrappingRouter

getRouter = lambda: APIRouter(route_class=EndpointWrappingRouter)

__all__ = ["conf", "server", "exceptions", "static", "utils", "getRouter", "logger"]
