"""
LLM Actor Provider (데스크탑 전용)

기존 Ray actor_manager.get_llm_actor()를 대체하는 클린 모듈.
Worker들이 이 모듈에서 get_llm_actor()를 import하여 사용.

기존 (클라우드):
  from tts_workflow.core.llm.llm_provider import get_llm_actor
  llm_actor = get_llm_actor()  # Ray ActorHandle 반환

변경 (데스크탑):
  from tts_workflow.core.llm.llm_provider import get_llm_actor
  llm_actor = get_llm_actor()  # LocalLLMActor 반환
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:
    from app.socket.local_llm_actor import LocalLLMActor

_llm_actor: Optional[Any] = None


def set_llm_actor(actor: "LocalLLMActor") -> None:
    """초기화 시 LLM Actor 인스턴스 등록"""
    global _llm_actor
    _llm_actor = actor


def get_llm_actor() -> "LocalLLMActor":
    """Worker에서 호출하는 LLM Actor 조회 함수"""
    if _llm_actor is None:
        raise RuntimeError("LLM Actor not initialized. Call set_llm_actor() first.")
    return _llm_actor
