from typing import Annotated
from fastapi import Depends

from core import getRouter
from core.server.service.service_base import BaseService
from core.server.repository.repository_base import BaseRepository
from core.dto.base_response import NoneDataResponse

from app.pre_process.service import PreProcessService
from app.pre_process.dto.req import PreProccessRequest, PreProccessSample, PreProccessStatusRequest
from app.pre_process.dto.res import  PreProccessStatus

router = getRouter()


def get_repository() -> BaseRepository:
    """Repository 인스턴스 생성"""
    return BaseRepository()


def get_service(
    repository: Annotated[BaseRepository, Depends(get_repository)],
) -> PreProcessService:
    """Service 인스턴스 생성 - Repository를 주입받음"""
    return PreProcessService(repository=repository)


@router.post("")
async def preprocess_single(
    request: PreProccessRequest, service: BaseService = Depends(get_service)
) -> NoneDataResponse:
    await service.pre_process(**request.model_dump())

    return NoneDataResponse()


@router.post("/status")
async def preprocess_status(
    request: PreProccessStatusRequest, service: BaseService = Depends(get_service)
) -> PreProccessStatus:
    result = await service.pre_process_status(**request.model_dump())

    return PreProccessStatus(**result)


@router.post("/sample")
async def preprocess_sample(
    request: PreProccessSample, service: BaseService = Depends(get_service)
) -> NoneDataResponse:
    await service.pre_process_sample(**request.model_dump())

    return NoneDataResponse()