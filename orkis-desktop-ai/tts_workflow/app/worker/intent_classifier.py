from typing import Any, Dict, List, Tuple
from tts_workflow.core.conf.worker_conf.worker_config import WorkConfig
from tts_workflow.core.llm.llm_provider import get_llm_actor
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.work import Work
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.service.source_search_service import SourceSearchService


class IntentClassifier(Work):
    def __init__(
        self,
        conf: WorkConfig,
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
            "HISTORY": state.chat_history,
            "QUESTION": state.task.question,
            "TOPICS": state.task.topics,
            "DB_INFO": state.task.db_id
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

        # JSON 파싱 결과: {"rewritten_question": str|null, "requires_db_retrieval": bool|null}
        rewritten_question = response.get("rewritten_question")
        requires_db_retrieval = response.get("requires_db_retrieval")

        exec_logger.info(
            f"IntentClassifier: original='{state.task.question}' -> "
            f"rewritten='{rewritten_question}', requires_db_retrieval={requires_db_retrieval}"
        )

        return {
            "rewritten_question": rewritten_question,
            "requires_db_retrieval": requires_db_retrieval,
        }, messages

    @staticmethod
    def route(state: SystemState) -> str:
        # rewritten_question이 None이면 clarification 필요 -> general_step
        if state.rewritten_question is None:
            return "general_step"
        elif state.requires_db_retrieval:
            return "tts_step"
        else:
            return "general_step"
