import json
from typing import Callable
from pydantic import BaseModel

from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from starlette.requests import Request
from starlette.responses import Response
from starlette.requests import ClientDisconnect
from core.dto.base_response import BaseResponse
from core.utils.LogUtil import LogUtil as logger

from ...utils.DictionaryUtil import DictionaryUtil


class EndpointWrappingRouter(APIRoute):
    # def __init__(self, *args, **kwargs) -> None:
    #     super().__init__(*args, **kwargs)

    @staticmethod
    async def json_response_wrapper(request: Request, response: Response):
        try:
            body = json.loads(response.body.decode())

            # 표준 형식으로 래핑
            wrapped_content = BaseResponse(success=True, result=body)

            return JSONResponse(
                content=wrapped_content.model_dump(), status_code=response.status_code
            )

        except ClientDisconnect as e:
            logger.error(f"ClientDisconnect: {e}")
            logger.error(f"ClientDisconnect: {response}")
            return response
        except Exception as e:
            logger.error(f"Response wrapping error: {e}")
            return response

    @staticmethod
    async def request_log(request: Request):
        pass

    def get_route_handler(self) -> Callable:
        original_route_handler = super().get_route_handler()

        # [CHECK] App context 관리 가능한지 확인 해보기
        async def custom_route_handler(request: Request) -> Response:
            response: Response = await original_route_handler(request)

            # json 응답인 경우
            if isinstance(response, JSONResponse):
                return await self.json_response_wrapper(
                    request=request, response=response
                )
            else:
                return response

        return custom_route_handler
