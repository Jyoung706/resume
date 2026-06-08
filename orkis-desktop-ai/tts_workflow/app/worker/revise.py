import copy
from typing import Any, Dict, List, Tuple

from tts_workflow.app.utils.logger.exec_logger import exec_logger

from tts_workflow.app.vector_search.service.source_search_service import SourceSearchService
from tts_workflow.core.llm.llm_provider import get_llm_actor
from tts_workflow.core.vector_search.constants import ExecutionStatus
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.sql_meta_info import SQLMetaInfo
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class Revise(Work):
    svc:SourceSearchService

    def __init__(
        self,
        conf:WorkInput,
        template_name: str = None,
        engine_config: str = None,
        parser_name: str = None
    ):
        super().__init__(conf)
        self.template_name = template_name
        self.engine_config = engine_config
        self.parser_name = parser_name

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:
        # [CHECK] 추후 성능 체크 필요 (deep copy)
        SQL_meta_infos = copy.deepcopy(state.SQL_meta_infos)

        try:
            key_to_refine = list(SQL_meta_infos.keys())[-1]  # 제일 최근 생성 된 sql 기준으로 revise
            target_SQL_meta_infos = SQL_meta_infos[key_to_refine]
        except Exception as e:
            exec_logger.error(f"Error in Checker: {e}")
            return

        if key_to_refine.startswith(self.work_name):
            id = int(key_to_refine[len(self.work_name) + 1 :])
            SQL_id = self.work_name + "_" + str(id + 1)
        else:
            SQL_id = self.work_name + "_1"

        SQL_meta_infos[SQL_id] = []
        request_list = []

        for SQL_meta_info in target_SQL_meta_infos:
            try:
                execution_status = SQL_meta_info.execution_status
                if execution_status != ExecutionStatus.SYNTACTICALLY_CORRECT:
                    SQL_meta_info.need_fixing = True
            except Exception:
                SQL_meta_info.need_fixing = True

        need_fixing_SQL_meta_infos = [
            (index, target_SQL_meta_info)
            for index, target_SQL_meta_info in enumerate(target_SQL_meta_infos)
            if target_SQL_meta_info.need_fixing
        ]

        for index, target_SQL_meta_info in need_fixing_SQL_meta_infos:
            try:
                request_kwargs = {
                    "DATABASE_SCHEMA": state.get_schema_string(schema_type="complete"),
                    "QUESTION": state.rewritten_question,
                    "HINT": state.task.evidence,
                    "QUERY": target_SQL_meta_info.SQL,
                    "RESULT": self.get_formatted_execution_result(target_SQL_meta_info),
                }
                request_list.append(request_kwargs)
            except Exception as e:
                exec_logger.error(f"Error in Checker while creating request list: {e}")
                continue

        if request_list:
            try:
                llm_actor = get_llm_actor()

                response = await llm_actor.llm_chain_calls.remote(
                    template_name=self.template_name,
                    engine_config={
                        **self.engine_config,
                        "api_key": state.task.api_key,
                        "streaming": self.streaming,
                        "chat_id": state.task.chat_id,
                        "proc_id": self.proc_id,
                    },
                    parser_name=self.parser_name,
                    request_list=request_list,
                    step=self.work_name,
                )

                messages = [r[0][1] for r in response]
                messages = [msg for msglist in messages for msg in msglist]

                response = [r[0][0] for r in response]
            except Exception as e:
                exec_logger.error(f"Error in Checker while getting response: {e}")
                response = []
                messages = []
        else:
            response = []
            messages = []

        index = 0
        for target_SQL_meta_info in target_SQL_meta_infos:
            try:
                if target_SQL_meta_info.need_fixing:
                    refinement_response = response[index]
                    index += 1
                    if "SELECT" not in refinement_response["refined_sql_query"]:
                        refinement_response = {
                            "refined_sql_query": target_SQL_meta_info.SQL
                        }
                else:
                    refinement_response = {
                        "refined_sql_query": target_SQL_meta_info.SQL
                    }
            except Exception as e:
                exec_logger.error(f"Error in Checker while updating SQL meta info: {e}")
                refinement_response = {"refined_sql_query": target_SQL_meta_info.SQL}

            if "refined_sql_query" in refinement_response:
                if refinement_response["refined_sql_query"]:
                    sql_meta_info = SQLMetaInfo(**{"SQL": refinement_response["refined_sql_query"]})
                    sql_meta_info.execution_result = self.svc.get_execution_result(sql=sql_meta_info.SQL)
                    sql_meta_info.execution_status = self.svc.get_execution_status(sql=sql_meta_info.SQL, execution_result=sql_meta_info.execution_result)

                    SQL_meta_infos[SQL_id].append(sql_meta_info)

        return {
            "SQL_meta_infos": SQL_meta_infos
        }, messages

    def get_formatted_execution_result(self, target_SQL_meta_info: SQLMetaInfo) -> str:
        try:
            execution_result = target_SQL_meta_info.execution_result
            return {"execution_result": execution_result}
        except Exception as e:
            return {"execution_result": str(e)}

    def need_to_fix(self, state: SystemState) -> bool:
        key_to_check = list(state.SQL_meta_infos.keys())[-1]
        SQL_meta_infos = state.SQL_meta_infos[key_to_check]
        needs_fixing = False
        for SQL_meta_info in SQL_meta_infos:
            try:
                execution_status = SQL_meta_info.execution_status
                if execution_status != ExecutionStatus.SYNTACTICALLY_CORRECT:
                    SQL_meta_info.need_fixing = True
                    needs_fixing = True
            except Exception:
                SQL_meta_info.need_fixing = True
                needs_fixing = True

        if self.fixing == self.max_fixing:
            return False
        self.fixing += 1

        return needs_fixing
