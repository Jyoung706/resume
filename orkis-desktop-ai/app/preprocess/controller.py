"""
Preprocess Controller - HTTP 경계 어댑터.

- endpoint path 는 cloud (orkis-ai) 의 `POST /v1/preprocess` 와 일치 (`""`).
- background task 로 run_preprocess 실행, 즉시 응답.
- 진행 상태는 service 가 backend SQLite 직접 UPDATE → frontend polling 으로 인지.
"""
import asyncio

from fastapi import APIRouter

from app.preprocess.dto import PreprocessSampleRequest, PreprocessStartRequest
from app.preprocess.service import run_preprocess, verify_sample_assets

router = APIRouter()


@router.post("")
async def preprocess(req: PreprocessStartRequest):
    """RAG 전처리 시작 - background task 실행 후 즉시 응답."""
    data = req.model_dump()

    asyncio.create_task(run_preprocess(data))

    return {"success": True}


@router.post("/sample")
async def preprocess_sample(req: PreprocessSampleRequest):
    """샘플 DB 전처리 (cloud `POST /preprocess/sample` 대응).

    cloud 는 미리 전처리된 샘플 인덱스를 NETWORK_PATH → ROOT_PATH 로 복사하지만
    (preprocess_copy), desktop 은 경로가 DB_NETWORK_PATH 단일이라 backend 의
    sample_db 자산 복사로 산출물이 이미 제자리에 있다 → 존재 검증만 수행.
    """
    return verify_sample_assets(req.db_id)
