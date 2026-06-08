import time
from uuid6 import uuid7
import ctypes
import gc
from pathlib import Path
from typing import Any
import yaml

from tts_workflow.core.conf.config import config

# 프로세스 전역: 과도 호출 방지(쓰로틀링)
_LAST_TRIM_TS = 0

class CommonUtil:
    @staticmethod
    def generate_uuid() -> str:
        return str(uuid7())
    
    @staticmethod
    def malloc_trim():
        """
        힙에서 사용하지 않는 메모리를 운영체제에 반환합니다.
        일단 사용
        """
        global _LAST_TRIM_TS
        now = time.time()

        if now - _LAST_TRIM_TS < config.DEALLOC_INTERVAL:
            return
        try:
            libc = ctypes.CDLL("libc.so.6")
            # libc.malloc_trim.argtypes = [ctypes.c_size_t]
            # libc.malloc_trim.restype = ctypes.c_int

            gc.collect()
            libc.malloc_trim(0)
            _LAST_TRIM_TS = now
        except Exception as e:
            return
    
    @staticmethod
    def get_config(conf_path: Path) -> Any:
        if not isinstance(conf_path, Path):
            conf_path = Path(conf_path)

        if not conf_path.exists():
            raise FileNotFoundError(f"config file not found: {conf_path}")

        if not conf_path.is_file():
            raise ValueError(f"config path is not a file: {conf_path}")

        if conf_path.suffix not in [".yaml", ".yml"]:
            raise ValueError(
                f"config file must be a YAML file: {conf_path}"
            )

        try:
            with open(conf_path, "r", encoding="UTF8") as file:
                config = yaml.safe_load(file)

            if config is None:
                raise ValueError(f"config file is empty: {conf_path}")

            return config

        except yaml.YAMLError as e:
            raise ValueError(f"Failed to parse YAML file {conf_path}: {e}")
        except Exception as e:
            raise RuntimeError(
                f"Failed to load config from {conf_path}: {e}"
            )
    