from abc import ABC, abstractmethod
import json
import os
from typing import Dict, Any, List, Tuple
from functools import wraps
from langchain_core.messages import AnyMessage


from tts_workflow.app.utils.logger.exec_logger import exec_logger, _work_name_context
from tts_workflow.core.exceptions.base import CriticalError
from tts_workflow.core.worker.dataclass.chat import Chat
from tts_workflow.core.worker.dataclass.system_state import SystemState
from tts_workflow.core.worker.dataclass.work_input import WorkInput
from tts_workflow.core.utils import CommonUtil


def retry_decorator(func):
    @wraps(func)
    def wrapper(self, state: SystemState, max_retry: int, *args, **kwargs):
        if getattr(self, "retry_count", None) is None:
            self.retry_count = 0
        else:
            self.retry_count += 1

        if self.retry_count >= max_retry:
            self.retry_count = 0
            return "next"

        return func(self, state, max_retry)

    return wrapper


class Work(ABC):
    """
    Work 베이스 클래스 (Async)

    LangGraph astream()과 함께 사용하기 위해 비동기화.
    """

    def __init__(self, conf: WorkInput):
        self.work_name = conf.work_name

        if conf.streaming is None:
            self.streaming = True
        else:
            self.streaming = conf.streaming

        if conf.proc_id is None:
            self.proc_id = 0
        else:
            self.proc_id = conf.proc_id

        self._inject_services()

        # 로그 설정

    def _inject_services(self):
        from typing import get_type_hints
        from tts_workflow.core.vector_search.service.base_service import BaseService
        from tts_workflow.core.vector_search.registry import Registry

        hints = get_type_hints(self.__class__)
        for name, hint_type in hints.items():
            if isinstance(hint_type, type) and issubclass(hint_type, BaseService):
                setattr(self, name, Registry.get(hint_type))

    # [CHECK] 현재 수정을 한 특정 state value 를 지정해서 반환하게 되어 있음.
    # 병렬처리 때문이긴 한데 이럴 필요 있는지는 고민 해보기.
    # 필요 없다면 system state 전체 반환으로 수정
    async def __call__(self, state: SystemState) -> Dict[str, Any]:
        """
        Work 노드 실행 (비동기)

        LangGraph astream()에서 호출됨.
        """
        token = _work_name_context.set(self.work_name)
        try:
            
            result = {}

            try:
                # engine_config 속성이 있는 경우에만 처리
                if hasattr(self, "engine_config") and self.engine_config is not None:
                    self.engine_config["engine_name"] = state.task.llm_model
                    self.engine_config["api_key"] = state.task.api_key

                result, messages = await self._run(state)
                result.update(self._get_updates(state, result))

                if messages:
                    self._update_messages(state, messages, result)

            except CriticalError:
                raise
            except Exception as e:
                import traceback
                tb = traceback.format_exc()

                state.errors[self.work_name] = f"{type(e).__name__}: {e}\n{tb}"
                result = state.errors

                exec_logger.error(f"Error in {self.work_name}: {e}\n{tb}")

            return result
        finally:
            _work_name_context.reset(token)

    @abstractmethod
    async def _run(self, state: SystemState) -> Tuple[Dict[str, Any], List[Chat]]:
        """
        Work 노드 실행 로직 (비동기)

        하위 클래스에서 구현 필수.
        """
        pass

    def _get_updates(self, input_state: SystemState, result: Dict[str, Any]) -> Dict[str, Any]:
        return {}

    def _update_messages(self, state: SystemState, messages: List[AnyMessage], result: Dict[str, Any]) -> None:
        try:
            chat_list = []
            for message in messages:
                chat = Chat(
                    chat_id=state.task.chat_id, work_name=self.work_name, message=message
                )
                chat_list.append(chat)

            result["__messages__"] = chat_list
        except Exception as e:
            exec_logger.error(f"Error in {self.work_name}(_save_messages): {e}")

    @staticmethod
    def route(state: SystemState) -> str:
        pass

    @retry_decorator
    def rcr_route(self, state: SystemState, max_retry: int) -> str:
        return self.route(state)
