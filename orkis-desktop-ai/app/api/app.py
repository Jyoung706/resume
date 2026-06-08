"""
FastAPI ASGI 앱.

- lifespan: 워크플로우 사전 로딩
- HTTP POST: workflow 유발 (chat/start, cancel, preprocess/start)
- 이벤트 전송: REST/SSE 기반 (transport 는 controller 가 request 단위로 init)
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작 시 워크플로우 사전 로딩."""
    from app.chat.service import initialize
    asyncio.create_task(initialize())

    yield


def create_app() -> FastAPI:
    """FastAPI 인스턴스 생성 (orkis-ai ServerApplication 패턴)"""
    app = FastAPI(
        title="orkis-desktop-ai",
        lifespan=lifespan,
    )

    from app.api.routers import router
    app.include_router(router)

    return app
