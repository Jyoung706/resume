from typing import Dict, List, Any, Tuple

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.ray.actor_manager import get_llm_actor
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work
from tts_workflow.core.worker.dataclass.chat import Chat


class SelectTables(Work):
    def __init__(
        self,
        conf:WorkInput,
        template_name: str = None,
        engine_config: str = None,
        parser_name: str = None,
        sampling_count: int = 1,
    ):
        super().__init__(conf)
        self.template_name = template_name
        self.engine_config = engine_config
        self.parser_name = parser_name
        self.sampling_count = sampling_count

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:
        request_kwargs = {
            "DATABASE_SCHEMA": state.get_schema_string(schema_type="tentative"),
            "QUESTION": state.rewritten_question,
            "HINT": state.task.evidence,
        }

        llm_actor = get_llm_actor()

        response_llm = (await llm_actor.llm_chain_calls.remote(
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
            sampling_count=self.sampling_count,
        ))[0]

        response = [res[0] for res in response_llm]
        messages = [res[1] for res in response_llm]
        messages = [msg for msglist in messages for msg in msglist]

        aggregated_result = self.aggregate_tables(response)

        tentative_schema = {
            table_name: state.tentative_schema.get(table_name, [])
            for table_name in aggregated_result["table_names"]
        }

        tentative_schema = state.add_columns_to_tentative_schema(
            tentative_schema, state.similar_columns
        )
        tentative_schema = state.add_connections_to_tentative_schema(tentative_schema)

        return {"tentative_schema": tentative_schema}, messages

    def aggregate_tables(
        self, tables_dicts: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        exec_logger.info("Aggregating tables from multiple responses")
        tables = []
        chain_of_thoughts = []
        for table_dict in tables_dicts:
            chain_of_thoughts.append(table_dict.get("chain_of_thought_reasoning", ""))
            response_tables = table_dict.get("table_names", [])
            for table in response_tables:
                if table.lower() not in [t.lower() for t in tables]:
                    tables.append(table)

        aggregated_chain_of_thoughts = "\n----\n".join(chain_of_thoughts)
        aggregation_result = {
            "table_names": tables,
            "chain_of_thought_reasoning": aggregated_chain_of_thoughts,
        }
        exec_logger.info(f"Aggregated tables: {tables}")
        return aggregation_result
