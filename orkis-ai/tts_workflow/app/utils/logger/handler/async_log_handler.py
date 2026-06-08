import logging
from contextvars import ContextVar
from typing import Optional

class AsyncLogHandler(logging.Handler):
    """
    Ray LogActor로 로그를 전달하는 비동기 핸들러

    - logging.Handler를 상속하여 Python 표준 로깅과 호환
    - emit()에서 LogActor.log.remote() 호출 (fire & forget)
    - ContextVar를 통해 chat_id, work_name 캡처
    """

    def __init__(
        self,
        _logger_id: ContextVar[Optional[str]],
        work_name_context: ContextVar[Optional[str]]
    ):
        super().__init__()
        self._log_actor = None
        self._logger_id = _logger_id
        self._work_name_context = work_name_context
        self._get_log_actor = None

    def emit(self, record: logging.LogRecord) -> None:
        """
        로그 레코드를 LogActor로 전달 (논블로킹)

        - ray.get() 호출 없이 .remote()만 호출 (fire & forget)
        - 호출자는 즉시 반환됨
        """
        if self._get_log_actor is None:
            from tts_workflow.core.ray.actor_manager import get_log_actor
            self._get_log_actor = get_log_actor

        actor = self._get_log_actor()

        try:
            actor.log.remote(
                record.name,
                record.levelno,
                self.format(record),
                self._logger_id.get(),
                self._work_name_context.get()
            )
        except Exception:
            self.handleError(record)
