# from typing import Any, Callable, Dict, List, Optional, Sequence, Set, Type, Union
from .DictionaryUtil import DictionaryUtil
import traceback
from typing import Any
from ..exceptions.user import ParameterParseException
from .LogUtil import LogUtil as logger


class RequestUtil:
    @staticmethod
    def getPacket(request: Any):
        try:
            return DictionaryUtil.dictToObject(request.body.request)
        except Exception as err:
            traceback_message = traceback.format_exc()
            logger.error(traceback_message)
            raise ParameterParseException
