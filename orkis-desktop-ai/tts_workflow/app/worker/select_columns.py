import logging
from typing import Dict, List, Any, Tuple

from tts_workflow.core.llm.llm_provider import get_llm_actor
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class SelectColumns(Work):
    def __init__(
        self,
        conf:WorkInput,
        template_name: str,
        engine_config: Dict[str, Any],
        parser_name: str,
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

        aggregated_result = self.aggregate_columns(
            response, list(state.tentative_schema.keys())
        )

        return {"tentative_schema": aggregated_result}, messages

    def union_schemas(self, schemas):
        schema_union = {}
        for schema in schemas:
            for table, columns in schema.items():
                table_lower = table.lower()
                col_lower = [col.lower() for col in columns]
                if table_lower not in schema_union:
                    schema_union[table_lower] = []
                schema_union[table_lower] += [
                    col for col in col_lower if col not in schema_union[table_lower]
                ]
        return schema_union

    def aggregate_columns(
        self, columns_dicts: List[Dict[str, Any]], selected_tables: List[str]
    ) -> Dict[str, List[str]]:
        """
        Aggregates columns from multiple responses and consolidates reasoning.

        Args:
            columns_dicts (List[Dict[str, Any]]): List of dictionaries containing column names and reasoning.
            selected_tables (List[str]): List of selected tables.

        Returns:
            Dict[str, List[str]]: Aggregated result with unique column names and consolidated reasoning.
        """
        logging.info("Aggregating columns from multiple responses")
        columns = {}
        chain_of_thoughts = []
        for column_dict in columns_dicts:
            valid_column_dict = False
            for key, value in column_dict.items():
                if key == "chain_of_thought_reasoning":
                    dict_cot = value
                else:  # key is table name
                    table_name = key
                    if table_name.startswith("`"):
                        table_name = table_name[1:-1]
                    column_names = value
                    if table_name.lower() in [t.lower() for t in selected_tables]:
                        for column_name in column_names:
                            if column_name.startswith("`"):
                                column_name = column_name[1:-1]
                            if table_name not in columns:
                                columns[table_name] = []
                            if column_name.lower() not in [
                                col.lower() for col in columns[table_name]
                            ]:
                                columns[table_name].append(column_name)
                            valid_column_dict = True
            if valid_column_dict:
                chain_of_thoughts.append(dict_cot)

        aggregation_result = columns
        # aggregated_chain_of_thoughts = "\n----\n".join(chain_of_thoughts)
        # aggregation_result["chain_of_thought_reasoning"] = aggregated_chain_of_thoughts
        return aggregation_result
