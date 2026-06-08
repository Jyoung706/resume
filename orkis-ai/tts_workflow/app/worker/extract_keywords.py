from typing import Any, Dict, List, Tuple

from tts_workflow.core.ray.actor_manager import get_llm_actor
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class ExtractKeywords(Work):
    def __init__(
        self,
        conf:WorkInput,
        template_name: str = None,
        engine_config: str = None,
        parser_name: str = None,
    ):
        super().__init__(conf)
        self.template_name = template_name
        self.engine_config = engine_config
        self.parser_name = parser_name

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:
        request_kwargs = {
            "QUESTION": state.rewritten_question,
            "HINT": state.task.evidence,
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

        return {"keywords": response}, messages

    # [CHECK] 매번 decorator 붙여야 하는거 심각하게 마음에 안듬
    # @retry_decorator
    # def rcr_route(self, state: SystemState, max_retry: int) -> str:
    #     return "recursive"
