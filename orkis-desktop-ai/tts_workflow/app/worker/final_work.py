"""
Final Work (데스크탑 전용)

Redis 의존성 제거. handler.py가 결과를 소켓으로 직접 전송하므로
Redis 스트리밍(stream_start, streaming, stream_end)이 불필요.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class Final(Work):
    def __init__(
        self,
        conf: WorkInput,
        template_name: Optional[str] = None,
        engine_config: Optional[str] = None,
        parser_name: Optional[str] = None,
        language: str = "Korean",
        limit_characters: int = 500,
        delimiter: str = "$$",
    ):
        super().__init__(conf)
        self.template_name = template_name
        self.engine_config = engine_config
        self.parser_name = parser_name
        self.language = language
        self.limit_characters = limit_characters
        self.delimiter = delimiter

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:
        final_answer = None
        if state.requires_db_retrieval:
            final_answer = state.evaluation_result["selected_candidate"].strip()
        else:
            final_answer = state.general_answer

        return {"final_answer": final_answer}, []
