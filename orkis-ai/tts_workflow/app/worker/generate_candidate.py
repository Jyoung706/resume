from typing import Any, Dict, List, Tuple
from pydantic import BaseModel

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.service.source_search_service import SourceSearchService
from tts_workflow.core.ray.actor_manager import get_llm_actor
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.sql_meta_info import SQLMetaInfo
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.worker.work import Work


class GenerateCandidate(Work):
    svc:SourceSearchService

    class GeneratorConfig(BaseModel):
        template_name: str
        engine_config: Dict
        parser_name: str
        sampling_count: int
        input_file_path: str = None

    def __init__(
        self,
        conf:WorkInput,
        generator_configs: list[Dict]
    ):
        super().__init__(conf)
        self.gcfgs = generator_configs
        self.next_generator_to_use = "ALL"

    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:
        generator_configs = []
        generators_queries = {}

        for config in self.gcfgs:
            config["engine_config"]["engine_name"] = state.task.llm_model
            config["engine_config"]["api_key"] = state.task.api_key
            generator_configs.append(self.GeneratorConfig(**config))

        SQL_meta_infos = {}
        SQL_meta_infos[self.work_name] = []

        for generator_config in generator_configs:
            generators_queries[generator_config.template_name] = []

        llm_actor = get_llm_actor()

        for generator_config in generator_configs:
            if (
                self.next_generator_to_use != "ALL"
                and generator_config.template_name != self.next_generator_to_use
            ):
                continue
            request_list = []
            for i in range(generator_config.sampling_count):
                try:  
                    request_kwargs = {
                        "DATABASE_SCHEMA": state.get_schema_string(
                            schema_type="tentative"
                        ),
                        "QUESTION": state.rewritten_question,
                        "HINT": state.task.evidence,
                    }
                    request_list.append(request_kwargs)
                except Exception as e:
                    exec_logger.error(
                        f"Error in creating request_kwargs for generator {generator_config.template_name}: {e}"
                    )
                    continue

            try:
                response_llm = (await llm_actor.llm_chain_calls.remote(
                    template_name=generator_config.template_name,
                    engine_config={
                        **generator_config.engine_config,
                        "streaming": self.streaming,
                        "chat_id": state.task.chat_id,
                        "proc_id": self.proc_id,
                    },
                    parser_name=generator_config.parser_name,
                    request_list=request_list,
                    step=f"{self.work_name}_{generator_config.engine_config['engine_name']}",
                ))[0]

                response = [res[0] for res in response_llm]
                messages = [res[1] for res in response_llm]
                messages = [msg for msglist in messages for msg in msglist]

            except Exception as e:
                exec_logger.error(
                    f"Error in generating SQL queries for generator {generator_config.template_name}: {e}"
                )
                continue
            for res in response:
                if not res:
                    continue
                try:
                    sql_meta_info = SQLMetaInfo(**res)
                    sql_meta_info.execution_result = self.svc.get_execution_result(sql=sql_meta_info.SQL)
                    sql_meta_info.execution_status = self.svc.get_execution_status(sql=sql_meta_info.SQL, execution_result=sql_meta_info.execution_result)

                    generators_queries[generator_config.template_name].append(
                        sql_meta_info
                    )
                except Exception as e:
                    exec_logger.error(
                        f"Error in creating SQLMetaInfo for generator {generator_config.template_name}: {e}"
                    )
                    continue

            request_list = []
        for generator_config in generator_configs:
            if len(generators_queries[generator_config.template_name]) > 0:
                SQL_meta_infos[self.work_name] += generators_queries[
                    generator_config.template_name
                ]

        return {
            "SQL_meta_infos": SQL_meta_infos
        }, messages
