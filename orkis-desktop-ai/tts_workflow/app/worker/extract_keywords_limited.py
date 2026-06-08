from typing import Any, Dict, List, Tuple

from tts_workflow.core.llm.llm_provider import get_llm_actor
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class ExtractKeywordsLimited(Work):
    """키워드 추출 Worker - 최대 개수 제한 기능 포함"""

    def __init__(
        self,
        conf: WorkInput,
        template_name: str = None,
        engine_config: str = None,
        parser_name: str = None,
        max_keywords: int = 5,
    ):
        super().__init__(conf)
        self.template_name = template_name
        self.engine_config = engine_config
        self.parser_name = parser_name
        self.max_keywords = max_keywords

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:
        request_kwargs = {
            "QUESTION": state.rewritten_question,
            "HINT": state.task.evidence,
            "MAX_KEYWORDS": self.max_keywords,
        }

        llm_actor = get_llm_actor()

        response, messages = (await llm_actor.llm_chain_calls.remote(
            template_name=self.template_name,
            engine_config={
                **self.engine_config,
                "api_key": state.task.api_key,
                "streaming": self.streaming,
                "chat_id": state.task.chat_id,
                "proc_id": self.proc_id,
            },
            parser_name=self.parser_name,
            request_list=[request_kwargs],
            step=self.work_name,
        ))[0][0]

        # LLM이 지시를 무시할 경우를 대비해 슬라이싱 적용
        if isinstance(response, list) and len(response) > self.max_keywords:
            response = response[:self.max_keywords]

        return {"keywords": response}, messages
