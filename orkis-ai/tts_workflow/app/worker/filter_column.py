from typing import Any, Dict, List, Tuple
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.ray.actor_manager import get_llm_actor
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class FilterColumn(Work):
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
        column_profiles = state.src_search.get_column_profiles(
            schema_with_examples=state.schema_with_examples,
            use_value_description=True,
            with_keys=True,
            with_references=True,
            tentative_schema=state.tentative_schema,
        )

        list_of_kwargs = []
        for table_name, columns in column_profiles.items():
            for column_name, column_profile in columns.items():
                kwargs = {
                    "QUESTION": state.rewritten_question,
                    "HINT": state.task.evidence,
                    "COLUMN_PROFILE": column_profile,
                }
                list_of_kwargs.append(kwargs)

        llm_actor = get_llm_actor()

        response = await llm_actor.llm_chain_calls.remote(
            engine_config={
                **self.engine_config,
                "api_key": state.task.api_key,
                "streaming": self.streaming,
                "chat_id": state.task.chat_id,
                "proc_id": self.proc_id,
            },
            parser_name=self.parser_name,
            request_list=list_of_kwargs,
            step=self.work_name,
        )

        messages = [r[0][1] for r in response]
        messages = [msg for msglist in messages for msg in msglist]

        response = [r[0][0] for r in response]

        index = 0
        tentative_schema = state.tentative_schema
        for table_name, columns in column_profiles.items():
            tentative_schema[table_name] = []
            for column_name, column_profile in columns.items():
                try:
                    chosen = (
                        response[index]["is_column_information_relevant"].lower()
                        == "yes"
                    )
                    if chosen:
                        tentative_schema[table_name].append(column_name)
                except Exception as e:
                    exec_logger.error(
                        f"Error in column filtering for table '{table_name}', column '{column_name}': {e}"
                    )
                index += 1

        tentative_schema = state.add_columns_to_tentative_schema(
            tentative_schema, state.similar_columns
        )
        tentative_schema = state.add_connections_to_tentative_schema(tentative_schema)

        return {"tentative_schema": tentative_schema}, messages
