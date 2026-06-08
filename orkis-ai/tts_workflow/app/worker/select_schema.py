from typing import Dict, List, Any, Tuple

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.ray.actor_manager import get_llm_actor
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class SelectSchema(Work):
    """
    select_tables + select_columns 통합 워커.
    한 번의 LLM 호출로 테이블과 컬럼을 동시에 선택합니다.
    """

    def __init__(
        self,
        conf: WorkInput,
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

        # 응답에서 테이블과 컬럼 정보 추출
        aggregated_result = self.aggregate_schema(response)

        exec_logger.info(f"Selected schema: {aggregated_result}")

        # tentative_schema 업데이트 및 연결 테이블 추가
        tentative_schema = aggregated_result
        tentative_schema = state.add_connections_to_tentative_schema(tentative_schema)

        return {"tentative_schema": tentative_schema}, messages

    def aggregate_schema(self, schema_dicts: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """
        여러 응답에서 테이블과 컬럼 정보를 통합합니다.

        Args:
            schema_dicts: LLM 응답 리스트

        Returns:
            테이블명을 키로, 컬럼 리스트를 값으로 하는 딕셔너리
        """
        exec_logger.info("Aggregating schema from responses")
        columns = {}

        for schema_dict in schema_dicts:
            for key, value in schema_dict.items():
                if key == "chain_of_thought_reasoning":
                    continue

                # 백틱 제거
                table_name = key.strip("`")
                column_names = value

                if table_name not in columns:
                    columns[table_name] = []

                for col in column_names:
                    col_clean = col.strip("`") if isinstance(col, str) else col
                    if col_clean.lower() not in [c.lower() for c in columns[table_name]]:
                        columns[table_name].append(col_clean)

        exec_logger.info(f"Aggregated schema - tables: {list(columns.keys())}")
        return columns
