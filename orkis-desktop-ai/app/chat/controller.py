"""
Chat Controller - HTTP 경계 어댑터 (SSE Streaming).

- DTO 검증 (Pydantic)
- request-scoped SSEStreamTransport 생성 + ContextVar 주입
- ChatTaskManager 등록 (background task)
- StreamingResponse 로 SSE yield

Service는 dict/asyncio.Event 기반의 프로토콜 독립 로직이므로,
Controller가 그 경계를 책임진다.
"""
import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.chat.dto import ChatCancelRequest, ChatStartRequest
from app.chat.service import cancel_chat, run_chat
from app.transport.sse_transport import SSEStreamTransport
from core.task_manager import chat_task_manager
from tts_workflow.core.transport.context import init_transport

router = APIRouter()


@router.post("/start")
async def start(req: ChatStartRequest):
    """채팅 시작 - request-scoped SSE 스트림 응답."""
    data = req.model_dump()
    queue: asyncio.Queue = asyncio.Queue()
    transport = SSEStreamTransport(queue)
    init_transport(transport)

    async def runner(cancel_event: asyncio.Event) -> None:
        try:
            await run_chat(data, cancel_event)
        finally:
            await transport.close()

    await chat_task_manager.submit(
        task_id=req.chatId,
        coro_factory=runner,
        session_id=req.sessionId,
    )

    async def event_stream():
        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/cancel")
async def cancel(req: ChatCancelRequest):
    """채팅 취소 - ChatTaskManager에 위임."""
    await cancel_chat(req.chatId)
    return {"status": "cancelled", "chatId": req.chatId}
