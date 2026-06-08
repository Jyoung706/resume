from __future__ import annotations

import asyncio

from tts_workflow.core.transport.base import EventTransport

# 워크플로우 이벤트명 → backend 수신 이벤트명 (raw 접두)
EVENT_MAP = {
    "chat:type": "raw:chat:type",
    "chat:token": "raw:chat:token",
    "chat:steps": "raw:chat:steps",
    "chat:step:update": "raw:chat:step:update",
    "chat:complete": "raw:chat:complete",
    "chat:error": "raw:chat:error",
    "chat:title": "raw:chat:title",
    "chat:llm:start": "raw:chat:llm:start",
    "chat:llm:end": "raw:chat:llm:end",
    "preprocess:progress": "raw:preprocess:progress",
    "preprocess:complete": "raw:preprocess:complete",
    "preprocess:error": "raw:preprocess:error",
}


class SSEStreamTransport(EventTransport):
    """asyncio.Queue 기반 Transport — SSE generator 가 queue 를 소비해 yield."""

    def __init__(self, queue: asyncio.Queue) -> None:
        self._queue = queue

    async def emit(self, event: str, data: dict) -> None:
        mapped = EVENT_MAP.get(event, event)
        await self._queue.put({"event": mapped, "data": data})

    async def close(self) -> None:
        # generator 종료 신호 (None 이면 generator 가 break)
        await self._queue.put(None)
