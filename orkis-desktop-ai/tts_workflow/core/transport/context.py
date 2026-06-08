import asyncio
from contextvars import ContextVar
from typing import Optional

from tts_workflow.core.transport.base import EventTransport

# transport: 요청마다 다르므로 ContextVar (SSE 전환 후 request-scoped)
_transport_var: ContextVar[Optional[EventTransport]] = ContextVar("transport", default=None)

# cancel_event: 요청(채팅)마다 다르므로 ContextVar
_cancel_var: ContextVar[Optional[asyncio.Event]] = ContextVar("cancel_event", default=None)


def init_transport(transport: EventTransport) -> None:
    _transport_var.set(transport)


def get_transport() -> EventTransport:
    transport = _transport_var.get()
    if transport is None:
        raise RuntimeError("Transport not initialized. Call init_transport() first.")
    return transport


def set_cancel_event(event: asyncio.Event) -> None:
    _cancel_var.set(event)


def get_cancel_event() -> Optional[asyncio.Event]:
    return _cancel_var.get()
