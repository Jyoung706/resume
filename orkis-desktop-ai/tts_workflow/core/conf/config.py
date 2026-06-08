from pydantic_settings import BaseSettings
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from tts_workflow.core.conf.logger_conf.logger_config import LoggerConfig

def _dbg(msg):
    """디버깅용 stderr 출력 (Electron [AI] 접두사 보장)"""
    print(f"[config.py] {msg}", file=sys.stderr, flush=True)

# PyInstaller 바이너리에서는 _MEIPASS 기준으로 .env 로드
_is_frozen = getattr(sys, 'frozen', False)
if _is_frozen:
    _base = sys._MEIPASS
else:
    _base = os.path.abspath(".")

_dbg(f"frozen={_is_frozen}, _base={_base}")
_dbg(f"platform={sys.platform}, cwd={os.getcwd()}")

_env_path = os.path.join(_base, ".env")
_env_exists = os.path.isfile(_env_path)
_dbg(f".env path={_env_path}, exists={_env_exists}")

_dotenv_result = load_dotenv(_env_path)
_dbg(f"load_dotenv() returned={_dotenv_result}")

# load_dotenv 후 주요 환경변수 상태 확인
_debug_keys = [
    "LOG_CONFIG_PATH", "WORKER_CONFIG_DIR", "BASIC_WORKER_PATH",
    "DB_ROOT_PATH", "DB_NETWORK_PATH", "TEMPLATES_ROOT_PATH",
    "CHAT_CONTEXT_DIR", "CHAT_SUMMARY_DIR", "TITLE_CONFIG_PATH",
    "SUMMARY_CONFIG_PATH", "OPENAI_API_KEY",
]
_dbg("--- env vars after load_dotenv ---")
for _dk in _debug_keys:
    _dv = os.getenv(_dk)
    # OPENAI_API_KEY는 앞 8자만 표시
    if _dk == "OPENAI_API_KEY" and _dv:
        _dbg(f"  {_dk}={_dv[:8]}...")
    else:
        _dbg(f"  {_dk}={_dv}")
_dbg("--- end env vars ---")

# PyInstaller frozen: 상대 경로 환경변수를 _MEIPASS 기준 절대 경로로 변환
# pydantic-settings가 env에서 직접 Path()로 변환하므로 여기서 미리 처리
if _is_frozen:
    _path_keys = [
        "LOG_CONFIG_PATH", "WORKER_CONFIG_DIR", "BASIC_WORKER_PATH",
        "DB_ROOT_PATH", "TEMPLATES_ROOT_PATH", "CHAT_CONTEXT_DIR",
        "CHAT_SUMMARY_DIR", "TITLE_CONFIG_PATH", "SUMMARY_CONFIG_PATH",
    ]
    for _k in _path_keys:
        _v = os.getenv(_k)
        if _v and not os.path.isabs(_v):
            _resolved = os.path.join(_base, _v)
            os.environ[_k] = _resolved
            _dbg(f"  path resolved: {_k}={_v} -> {_resolved}")
        elif _v:
            _dbg(f"  path absolute (skip): {_k}={_v}")
        else:
            _dbg(f"  path empty: {_k}=(not set)")


class Config(BaseSettings):
    LOG_CONFIG_PATH: Path = Path("")
    WORKER_CONFIG_DIR: Path = Path("")
    BASIC_WORKER_PATH: Path = Path("")
    DB_ROOT_PATH: Path = Path("")
    TEMPLATES_ROOT_PATH: Path = Path("")


class DevConfig(Config):
    DB_NETWORK_PATH: Path = Path("")
    EMBEDDING_FUNCTION_MODEL: str = "text-embedding-3-large"
    CHAT_CONTEXT_DIR: Path = Path("")
    CHAT_SUMMARY_DIR: Path = Path("")
    TITLE_CONFIG_PATH: Path = Path("")
    SUMMARY_CONFIG_PATH: Path = Path("")
    LOG: str = "DEBUG"
    DEALLOC_INTERVAL: int = 10


config = DevConfig()
_dbg(f"config.LOG_CONFIG_PATH={config.LOG_CONFIG_PATH}")
_dbg(f"config.DB_NETWORK_PATH={config.DB_NETWORK_PATH}")
_dbg(f"config.WORKER_CONFIG_DIR={config.WORKER_CONFIG_DIR}")

# logger config 로드 — 경로 미설정 또는 파일 미존재 시 None (크래시 방지)
_log_path = config.LOG_CONFIG_PATH
_log_path_str = str(_log_path)
_log_path_is_file = os.path.isfile(_log_path) if _log_path_str != "." else False
_dbg(f"logger: path={_log_path_str}, is_file={_log_path_is_file}")

if _log_path and _log_path_str != "." and _log_path_is_file:
    logger_config = LoggerConfig.load_config(LOG_CONFIG_PATH=_log_path, log_level=config.LOG)
    _dbg("logger_config loaded from YAML")
else:
    logger_config = None
    _dbg("logger_config=None (path invalid or missing)")
