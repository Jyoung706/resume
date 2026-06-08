# tts_workflow/core/vector_search/executor/base_executor.py
"""
Executor Base Classes

- BaseExecutor: 모든 Executor의 기본 클래스
- BaseReader: 읽기 전용, Pool 캐싱 대상
- BaseWriter: 쓰기 전용, Pool 캐싱 안 함

정적 설정은 클래스 변수로, 동적 env는 __init__에서 받습니다.
각 서브클래스는 __env_schema__로 필요한 env 필드를 선언합니다.
"""

from abc import ABC, abstractmethod
from pathlib import Path

from tts_workflow.core.conf.config import config
from tts_workflow.app.utils.logger.exec_logger import exec_logger

class BaseExecutor(ABC):
    """
    Executor Base

    - 정적 설정: 클래스 변수로 정의 (root_path, timeout, encoding, file_extn)
    - 동적 env: __init__에서 **kwargs로 받아 auto-setattr
    - __env_schema__: 서브클래스에서 필요한 env 타입 선언 (TypedDict)

    사용법:
        class FaissReader(BaseReader):
            __env_schema__ = DBPathAPIEnv  # db_id, path, api_key
            _file_extn = "index"
            _timeout = 30.0

        class SqliteReader(BaseReader):
            __env_schema__ = DBEnv  # db_id만
    """
    # === Env Schema (생성 후 불변 변수, key 변수)===
    __env_schema__: type  # TypedDict 클래스

    # === 생성자 ===
    def __init__(self, **env) -> None:
        """
        Executor 생성

        스키마 기반 env 필터링 후 전달받은 kwargs를 자동으로 self._xxx에 등록합니다.

        Args:
            **env: __env_schema__에 정의된 필드들 (db_id, path, api_key 등)
        """
        # Auto-setattr: 모든 env를 self._xxx로 등록
        for k, v in env.items():
            setattr(self, f"_{k}", v)

        # db_name 자동 파생
        if hasattr(self, '_db_id') and self._db_id:
            self._db_name = Path(self._db_id).name
        else:
            self._db_name = None

        self._setup()

    # === Properties ===
    @property
    def db_id(self) -> str | None:
        return getattr(self, '_db_id', None)

    @property
    def db_name(self) -> str | None:
        # return getattr(self, '_db_name', None) # 임시
        return "aml"

    @property
    def api_key(self) -> str | None:
        return getattr(self, '_api_key', None)

    @property
    def path(self) -> str | None:
        return getattr(self, '_path', None)

    # === Common Methods ===
    def _exists(self, **kwargs) -> bool:
        try:
            if not hasattr(self, '_base_path'):
                exec_logger.error("Base Path not initialized.")
                return False
            return self._base_path.exists()
        except Exception as e:
            exec_logger.error(f"Error checking database existence: {str(e)}")
            return False
    
    def _delete(self, **kwargs) -> bool:
        
        try:
            if self._base_path.is_dir():
                import shutil
                shutil.rmtree(self._base_path)
            else:
                self._base_path.unlink()
            exec_logger.info(f"Successfully deleted at {self._base_path}")
            return True
        except PermissionError:
            exec_logger.warning("Permission denied, trying rm -rf")

            # subprocess로 강제 삭제 시도
            import subprocess
            try:
                result = subprocess.run(
                    ['rm', '-rf', str(self._base_path)],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0 and not self._base_path.exists():
                    exec_logger.info(f"Force deleted file using rm -f")
                    return True
                else:
                    exec_logger.error(f"rm -f failed: {result.stderr}")
                    return False
            except Exception as e:
                exec_logger.error(f"subprocess rm -f failed: {str(e)}")
                return False
        except Exception as e:
            exec_logger.error(f"Failed to delete file: {str(e)}")
            return False

    # === Abstract Methods ===
    @abstractmethod
    def _setup(self) -> None:
        """
        서브클래스에서 연결 로직 구현

        - self.db_id, self.db_name, self.api_key, self.path 사용 가능
        - 클래스 변수 self._root_path, self._timeout 등 사용 가능
        """
        pass

    @abstractmethod
    def close(self) -> None:
        """연결 종료 및 리소스 정리"""
        pass


class BaseReader(BaseExecutor):
    """
    읽기 전용 Executor

    - Pool 캐싱 대상
    - connect() 시 데이터 로드
    """
    _root_path = config.DB_ROOT_PATH

    pass


class BaseWriter(BaseExecutor):
    """
    쓰기 전용 Executor

    - Pool 캐싱 안 함
    - 사용 후 즉시 close
    """

    _root_path = config.DB_NETWORK_PATH

    def create(self, *arg, **kwargs) -> bool:

        self.clear() # 파일 전부 지우고 시작

        # 확장자가 있으면 파일 → 부모 디렉토리 생성, 없으면 디렉토리 자체 생성
        if self._base_path.suffix:
            self._base_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            self._base_path.mkdir(parents=True, exist_ok=True)
            
        return self._create(*arg, **kwargs)

    def clear(self, *arg, **kwargs) -> None:
        if self._exists():
            exec_logger.info("Existing file found, attempting to delete")
            if not self._delete():
                exec_logger.error("Failed to delete existing file")
                raise Exception("Cannot delete existing file. Check file permissions.")
    
    @abstractmethod
    def _create(self, *arg, **kwargs) -> None:
        pass