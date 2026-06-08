import ray
from typing import Dict, Optional, TYPE_CHECKING

from tts_workflow.core.conf.ray_config import ray_config
from tts_workflow.core.utils.cached_file_writer import CachedFileWriter

if TYPE_CHECKING:
    from tts_workflow.core.conf.logger_conf.logger_config import LoggerInfo


@ray.remote(
    num_cpus=ray_config.LOG_ACTOR_NUM_CPUS,
    memory=ray_config.LOG_ACTOR_MEMORY_MB * 1024 * 1024
)
class LogActor:
    """
    비동기 로깅을 위한 Ray Actor

    - 다른 Actor들로부터 .log.remote() 호출을 받아 파일에 쓰기
    - fire & forget 방식으로 호출자는 블로킹 없음
    - 날짜별 파일 캐싱으로 I/O 최적화
    """

    def __init__(self, logger_configs: Dict[str, "LoggerInfo"]):
        """
        Args:
            logger_configs: {logger_name: LoggerInfo}
        """
        self._file_writer = CachedFileWriter(logger_configs)

    def log(
        self,
        logger_name: str,
        level: int,
        msg: str,
        chat_id: Optional[str] = None,
        work_name: Optional[str] = None
    ) -> None:
        """
        로그 메시지 기록

        Args:
            logger_name: 로거 이름 (exec_logger, state_history_logger 등)
            level: 로그 레벨 (logging.INFO, logging.ERROR 등)
            msg: 포맷된 로그 메시지
            chat_id: 채팅 ID (선택)
            work_name: 작업 이름 (선택)
        """
        self._file_writer.write(logger_name, level, msg, chat_id, work_name)

    def flush(self) -> None:
        """모든 파일 버퍼 플러시"""
        self._file_writer.flush_all()

    def shutdown(self) -> None:
        """Actor 종료 시 정리"""
        self._file_writer.close_all()
