"""Transport 기반 LLM 스트림 핸들러.

AsyncSocketStreamHandler(Desktop) / AsyncRedisStreamHandler(Cloud)를 통합.
워크플로우는 transport.emit()만 호출하고, 실제 전송 방식은 모른다.
"""
from __future__ import annotations

from typing import Any

from langchain_core.callbacks.base import AsyncCallbackHandler

from tts_workflow.core.transport.context import get_transport, get_cancel_event
from tts_workflow.core.transport.events import WorkflowEvent


class AsyncTransportStreamHandler(AsyncCallbackHandler):
    # chat_id별 msg_id 카운터 (Cloud Redis INCR {chat_id}:c 대응)
    _msg_counters: dict[str, int] = {}

    def __init__(self, proc_id: int, chat_id: str):
        super().__init__()
        self.raise_error = True
        self.proc_id = proc_id
        self.chat_id = chat_id
        self._transport = get_transport()
        self._cancel_event = get_cancel_event()
        self._current_msg_id: str | None = None

    def _next_msg_id(self) -> str:
        counter = self._msg_counters.get(self.chat_id, 0) + 1
        self._msg_counters[self.chat_id] = counter
        return f"{self.chat_id}_{counter}"

    async def on_llm_start(self, serialized: Any, prompts: Any, **kwargs: Any) -> None:
        # Cloud stream_start() 대응: msgId 발급 + 경계 신호 emit
        self._current_msg_id = self._next_msg_id()
        await self._transport.emit(WorkflowEvent.CHAT_LLM_START, {
            "chatId": self.chat_id,
            "msgId": self._current_msg_id,
            "procId": self.proc_id,
        })

    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        if self._cancel_event and self._cancel_event.is_set():
            return

        if isinstance(token, list):
            token = "".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in token
            )
        if token:
            # Cloud streaming(): XADD {msgId} {m: token} 대응
            # msgId 포함해서 Backend가 LLM 호출별로 토큰을 분리 저장 가능
            await self._transport.emit(WorkflowEvent.CHAT_TOKEN, {
                "chatId": self.chat_id,
                "msgId": self._current_msg_id,
                "token": token,
            })

    async def on_llm_end(self, response: Any, **kwargs: Any) -> None:
        # Cloud stream_end() 대응: 해당 msgId 종료 신호
        if self._current_msg_id:
            await self._transport.emit(WorkflowEvent.CHAT_LLM_END, {
                "chatId": self.chat_id,
                "msgId": self._current_msg_id,
            })

    async def on_llm_error(self, error: Any, **kwargs: Any) -> None:
        from tts_workflow.core.exceptions.base import LLMAPIError
        raise LLMAPIError(f"[Error LLM]: {error}")
