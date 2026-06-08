from typing import Any, Dict, List, Tuple
from tts_workflow.core.llm.llm_provider import get_llm_actor
from tts_workflow.core.utils import CommonUtil
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work
from tts_workflow.app.utils.logger.exec_logger import exec_logger


class GeneralLLM(Work):
    def __init__(
        self,
        conf:WorkInput,
        template_name: str = None,
        clarification_template_name: str = None,
        engine_config: str = None,
        parser_name: str = None,
        language: str = "Korean",
        limit_characters: int = 300,
        assistant_name: str = None
    ):
        super().__init__(conf)
        self.template_name = template_name
        self.clarification_template_name = clarification_template_name
        self.engine_config = engine_config
        self.parser_name = parser_name
        self.language = language
        self.limit_characters = limit_characters
        self.assistant_name = assistant_name

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:
        # Determine which template to use based on rewritten_question
        # If rewritten_question is None -> clarification needed
        # If rewritten_question exists -> normal general response

        if state.rewritten_question is None:
            # Clarification request mode
            template_to_use = self.clarification_template_name or self.template_name
            question_to_use = state.task.question  # Use original question
            exec_logger.info(f"GeneralLLM: clarification mode for question='{question_to_use}'")
        else:
            # Normal general response mode
            template_to_use = self.template_name
            question_to_use = state.rewritten_question
            exec_logger.info(f"GeneralLLM: normal mode for question='{question_to_use}'")

        request_kwargs = {
            "ASSISTANT_NAME": self.assistant_name,
            "HISTORY": state.chat_history,
            "QUESTION": question_to_use,
            "LANGUAGE": self.language,
            "LIMIT_CHARACTERS": self.limit_characters,
        }

        llm_actor = get_llm_actor()

        response, messages = (await llm_actor.llm_chain_calls.remote(
            template_name=template_to_use,
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

        return {"general_answer": response}, messages
