from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, TYPE_CHECKING
import threading

from tts_workflow.core.conf.ray_config import ray_config

if TYPE_CHECKING:
    from tts_workflow.core.conf.logger_conf.logger_config import LoggerInfo


class CachedFileWriter:
    """
    날짜별 파일 핸들 캐싱을 통한 효율적인 로그 파일 쓰기

    - 날짜별 파일 핸들 캐싱
    - 자동 로테이션 (날짜 변경 시)
    - 버퍼링
    """

    def __init__(self, logger_configs: Dict[str, "LoggerInfo"]):
        """
        Args:
            logger_configs: {logger_name: LoggerInfo}
        """
        self._configs = logger_configs
        self._handles: Dict[tuple, object] = {}  # (logger_name, date_str) -> file handle
        self._current_date: str = datetime.now().strftime("%Y%m%d")
        self._lock = threading.Lock()
        self._buffer_size = ray_config.LOG_FILE_BUFFER_SIZE

    def write(
        self,
        logger_name: str,
        level: int,
        msg: str,
        chat_id: Optional[str] = None,
        work_name: Optional[str] = None
    ) -> None:
        """로그 메시지 쓰기"""
        if logger_name not in self._configs:
            return

        date_str = datetime.now().strftime("%Y%m%d")

        with self._lock:
            # 날짜 변경 시 로테이션
            if date_str != self._current_date:
                self._rotate_files(date_str)

            handle = self._get_or_create_handle(logger_name, date_str)
            if handle:
                handle.write(msg + "\n")

    def _get_or_create_handle(self, logger_name: str, date_str: str):
        """파일 핸들 획득 또는 생성"""
        key = (logger_name, date_str)

        if key not in self._handles:
            config = self._configs.get(logger_name)
            if not config or not config.root_save_dir or not config.save_fn:
                return None

            root_dir = Path(config.root_save_dir)
            save_fn = config.save_fn

            dir_path = root_dir / date_str
            dir_path.mkdir(parents=True, exist_ok=True)

            file_path = dir_path / save_fn
            # buffer_size=0이면 line buffering (즉시 쓰기)
            buffering = 1 if self._buffer_size == 0 else self._buffer_size
            self._handles[key] = open(
                file_path, "a", encoding="utf-8", buffering=buffering
            )

        return self._handles[key]

    def _rotate_files(self, new_date: str) -> None:
        """날짜 변경 시 이전 날짜 핸들 정리"""
        old_keys = [k for k in self._handles if k[1] != new_date]
        for key in old_keys:
            try:
                self._handles[key].flush()
                self._handles[key].close()
            except Exception:
                pass
            del self._handles[key]
        self._current_date = new_date

    def flush_all(self) -> None:
        """모든 파일 버퍼 플러시"""
        with self._lock:
            for handle in self._handles.values():
                try:
                    handle.flush()
                except Exception:
                    pass

    def close_all(self) -> None:
        """모든 파일 핸들 닫기"""
        with self._lock:
            for handle in self._handles.values():
                try:
                    handle.flush()
                    handle.close()
                except Exception:
                    pass
            self._handles.clear()
