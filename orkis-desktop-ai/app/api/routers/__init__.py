"""
라우터 통합 허브.

각 도메인 controller의 router를 수집해 prefix + tags와 함께 등록.
"""
from fastapi import APIRouter

from app.chat.controller import router as chat_router
from app.preprocess.controller import router as preprocess_router

router = APIRouter()

router.include_router(chat_router, prefix="/chat", tags=["chat"])
router.include_router(preprocess_router, prefix="/preprocess", tags=["preprocess"])
