from typing import Annotated
from fastapi import Depends

from core import getRouter
from core.server.service.service_base import BaseService
from core.server.repository.repository_base import BaseRepository
from core.dto.base_response import NoneDataResponse

from app.chat.service import ChatService
from app.chat.dto.req import CancleRequest, ConversationRequest
from app.chat.dto.res import ConversationResponse


router = getRouter()

def get_repository() -> BaseRepository:
    """Repository 인스턴스 생성"""
    return BaseRepository()

def get_service(
    repository: Annotated[BaseRepository, Depends(get_repository)],
) -> ChatService:
    """Service 인스턴스 생성 - Repository를 주입받음"""
    return ChatService(repository=repository)

@router.post("/conversation")
async def conversation(
    request: ConversationRequest, service: BaseService = Depends(get_service)
) -> ConversationResponse:
    result = await service.conversation(request)

    return ConversationResponse(**result)


@router.post("/cancel")
async def cancel(
    request: CancleRequest, service: BaseService = Depends(get_service)
) -> NoneDataResponse:
    await service.cancel(**request.model_dump())

    return NoneDataResponse()


@router.get("/health")
async def health_check() -> NoneDataResponse:
    return NoneDataResponse()
