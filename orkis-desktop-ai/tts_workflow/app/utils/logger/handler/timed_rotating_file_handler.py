import logging
from pathlib import Path
from datetime import datetime
import os


class TimedRotatingFileHandler(logging.Handler):
    def __init__(
        self, save_root_path: Path, save_fn: str, encoding: str = "utf-8"
    ) -> None:
        super().__init__()
        self.save_root_path = save_root_path
        self.save_fn = save_fn
        self.encoding = encoding

    def emit(self, record: logging.LogRecord) -> None:
        try:
            # [CHECK] 이거 너무 비효율 적이지 않나? 매전 로그 쓸 때 마다 파일 체크하는거
            date_str = datetime.now().strftime("%Y%m%d")
            os.makedirs(Path(self.save_root_path, date_str), exist_ok=True)

            log_entry = self.format(record)
            log_file_path = Path(self.save_root_path, date_str, self.save_fn)

            with open(log_file_path, "a", encoding=self.encoding) as f:
                f.write(log_entry + "\n")
        except Exception as e:
            self.handleError(record)
