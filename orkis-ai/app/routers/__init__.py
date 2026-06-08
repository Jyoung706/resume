from fastapi import APIRouter
from ..chat.controller import router as chat_router
from ..pre_process.controller import router as preprocess_router

router = APIRouter()
v1 = "/v1"
router.include_router(chat_router, prefix=f"{v1}", tags=["chat"])
router.include_router(preprocess_router, prefix=f"{v1}/preprocess", tags=["preprocess"])

__all__ = ["router"]
