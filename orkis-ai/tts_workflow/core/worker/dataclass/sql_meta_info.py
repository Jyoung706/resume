from pathlib import Path
from pydantic import BaseModel, PrivateAttr
from typing import List, Any, Dict

from tts_workflow.core.vector_search.constants import ExecutionStatus

# LAZY_RESULT_TOKEN = "$$$LAZY$$$"

class SQLMetaInfo(BaseModel):
    SQL: str
    plan: str = ""
    chain_of_thought_reasoning: str = ""
    error: str = ""
    need_fixing: bool = False
    evaluations: List[Dict[str, Any]] = []
    feedbacks: List[str] = []
    needs_refinement: bool = False
    refinement_steps: List[str] | str = []
    
    
    _execution_result: List[Any] = PrivateAttr(default=None)
    _execution_status: ExecutionStatus = PrivateAttr(default=None)

    @property
    def execution_result(self) -> List[Any]:
        return self._execution_result
    
    @property
    def execution_status(self) -> ExecutionStatus:
        return self._execution_status

    @execution_result.setter
    def execution_result(self, execution_result: List[Any] | str):
        self._execution_result = execution_result
    
    @execution_status.setter
    def execution_status(self, execution_status: ExecutionStatus):
        self._execution_status = execution_status

    def _is_too_long(self, result: List[Any]) -> bool:
        #TODO: customize this method's logic
        return len(result) > 50000

    # def _retrieve_lazy_result(self) -> List[Any]:
    #     try:    
    #         result = execute_sql(db_path=self.db_path, sql=self.SQL, fetch="all")
    #     except FunctionTimedOut:
    #         exec_logger.error("Timeout in execution_result")
    #         result = []
    #     return result

