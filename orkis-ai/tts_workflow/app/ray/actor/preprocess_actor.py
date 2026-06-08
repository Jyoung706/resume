
from typing import Any, Dict
import ray

from core.static.rag_enum import RAG_STAT, RAG_TYPE

from tts_workflow.core.conf.config import config

from tts_workflow.core.ray.actor.base_actor import BaseActor
from tts_workflow.core.conf.ray_config import ray_config

from tts_workflow.core.vector_search.bootstrap import init_registry
from tts_workflow.core.vector_search.context import executor_scope

from tts_workflow.core.worker.dataclass.task import PreprocessStatusTask, PreprocessTask

from tts_workflow.app.vector_search.service.faiss_preprocess_service import FaissPreprocessService

from tts_workflow.app.utils.logger.exec_logger import exec_logger

@ray.remote(
    num_cpus=ray_config.PREPROCESS_ACTOR_NUM_CPUS,
    memory=ray_config.PREPROCESS_ACTOR_MEMORY_MB * 1024 * 1024
)
class PreprocessActor(BaseActor):
    """
    전처리 실행 Actor
    """
    def __init__(self):
        # Service/Repository 등록
        init_registry()
        
        exec_logger.info(f"Preprocess Actor Init")

    async def validate_db(self, task_dict: Dict[str, Any]) -> bool:
        """
        임시 코드 — NAS 의 원본 sqlite 가 read-only 로 열리는지만 확인.

        현재 SqliteSourceRepository 의 reader 루트가 Local 이라 src repository 기반 검증은
        신규 DB 의 첫 처리 시 항상 실패한다. validate 의 본래 의미(원본이 NAS 에 있는지)를
        임시로 우회 구현. 추후 reader 의 root_path 분리 또는 별도 source reader 도입이
        정리되면 본 구현은 제거한다.
        """
        import sqlite3
        from pathlib import Path

        exec_logger.info(f"[PREPROCESS_ACTOR] validate_db() START")

        ok = False
        try:
            task = PreprocessTask(**task_dict)
            db_name = Path(task.db_id).name
            db_path = config.DB_NETWORK_PATH / task.db_id / f"{db_name}.sqlite"

            # NFS 위 SQLite 에서 .sqlite-shm / -wal 파일 생성을 회피하기 위해 read-only + immutable URI 사용
            conn = sqlite3.connect(
                f"file:{db_path}?mode=ro&immutable=1",
                uri=True,
                timeout=1.0,
                check_same_thread=False,
            )
            try:
                cur = conn.execute("SELECT 1")
                row = cur.fetchone()
                ok = bool(row and row[0] == 1)
            finally:
                conn.close()
        except Exception as e:
            exec_logger.error(f"validate_db failed (db_id={task_dict.get('db_id')}): {e}")
            ok = False

        exec_logger.info(f"[PREPROCESS_ACTOR] validate_db() END (result={ok})")
        return ok

    @executor_scope
    async def preprocess(self, task_dict: Dict[str, Any]) -> None:
        task = PreprocessTask(**task_dict)
        exec_logger.info(f"[PREPROCESS_ACTOR] preprocess() START: {task.db_id}")

        from tts_workflow.core.redis.chat_redis_repository import ChatRedisRepository
        from tts_workflow.core.redis.redis_manager import RedisManager

        chat_redis_cli = ChatRedisRepository(
            redis_client=RedisManager().chat_client, id=task.db_id
        )

        try:
            exec_logger.info(f"Running worker(db_id: {task.db_id}")

            if await chat_redis_cli.preprocess_exist(type=task.type):
                exec_logger.info(f"Preprocessing Already Running: {task.db_id}")
                return
            
            await chat_redis_cli.preprocess_start(type=task.type)

            with FaissPreprocessService() as svc:
                match task.type:
                    case RAG_TYPE.SCHEMA:
                        svc.schema_preprocess()
                    case RAG_TYPE.DATA:
                        svc.data_preprocess()
                    case _:
                        exec_logger.error(f"No Matching Rag Type {task.db_id}: {task.type}")
                        raise ValueError(f"No Matching Rag Type {task.db_id}: {task.type}")

            await chat_redis_cli.preprocess_end(type=task.type)
            
            exec_logger.info(f"Preprocessing completed successfully for database: {task.db_id}")
        except Exception as e:
            exec_logger.error(f"Pre-processing {task.db_id} failed: {e}")
            exec_logger.error(f"Error type: {type(e).__name__}")
            exec_logger.error(f"Error details: {str(e)}")
            chat_redis_cli.preprocess_end(type=task.type)

        exec_logger.info(f"[PREPROCESS_ACTOR] preprocess() END: {task.db_id}")
    
    @executor_scope
    async def preprocess_status(self, task_dict:Dict[str, Any]) -> RAG_STAT:
        task = PreprocessStatusTask(**task_dict)
        exec_logger.info(f"[PREPROCESS_ACTOR] preprocess_status() START: {task.db_id}")

        try:
            from tts_workflow.core.redis.chat_redis_repository import ChatRedisRepository
            from tts_workflow.core.redis.redis_manager import RedisManager

            chat_repo = ChatRedisRepository(
                redis_client=RedisManager().chat_client, id=task.db_id
            )

            if await chat_repo.preprocess_exist(type=task.type):
                exec_logger.info(f"[PREPROCESS_ACTOR] preprocess_status: RUNNING")
                return RAG_STAT.RUNNING

            with FaissPreprocessService() as svc:
                result = svc.status(task.type)

            exec_logger.info(f"[PREPROCESS_ACTOR] preprocess_status: {result}")
            return result
        except Exception as e:
            exec_logger.error(f"Pre-processing Status {task.db_id} failed: {e}")
            exec_logger.error(f"Error type: {type(e).__name__}")
            exec_logger.error(f"Error details: {str(e)}")
            raise
        finally:
            exec_logger.info(f"[PREPROCESS_ACTOR] preprocess_status END")

    
    async def sync_from_nas(self, db_id: str) -> None:
        """
        NAS 의 원본 자산을 Local 로 동기화.

        config.DB_SOURCE_ASSETS 에 명시된 상대 경로별로 Local 의 dst 를 정리하고
        NAS 의 src 를 그 자리로 복사한다. `{db_name}` placeholder 는
        Path(db_id).name 으로 치환. preprocessing 결과물 디렉토리(예: schema_vector_db)
        는 sync 대상이 아니므로 보존된다. type 별 race 회피를 위해 호출은 type 루프
        시작 전 1회만 (PreProcessService.pre_process 참조).
        """
        import shutil
        from pathlib import Path

        exec_logger.info(f"[PREPROCESS_ACTOR] sync_from_nas() START: {db_id}")

        db_name = Path(db_id).name
        for rel in config.DB_SOURCE_ASSETS:
            rel_path = Path(rel.format(db_name=db_name))
            src = config.DB_NETWORK_PATH / db_id / rel_path
            dst = config.DB_ROOT_PATH / db_id / rel_path

            if not src.exists():
                raise FileNotFoundError(f"NAS source asset not found: {src}")

            if dst.is_dir():
                shutil.rmtree(dst)
            elif dst.exists():
                dst.unlink()

            dst.parent.mkdir(parents=True, exist_ok=True)
            if src.is_dir():
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)

            exec_logger.info(f"[PREPROCESS_ACTOR] synced: {rel_path}")

        exec_logger.info(f"[PREPROCESS_ACTOR] sync_from_nas() END: {db_id}")

    async def preprocess_copy(self, db_id:str) -> bool:
        exec_logger.info(f"[PREPROCESS_ACTOR] preprocess_copy() START: {db_id}")

        result = False
        try:
            exec_logger.info(f"Running worker(db_id: {db_id}")
            
            import shutil
            src = config.DB_NETWORK_PATH / db_id
            dst = config.DB_ROOT_PATH / db_id

            if dst.exists():
                shutil.rmtree(dst)

            shutil.copytree(src, dst, dirs_exist_ok=True)

            exec_logger.info(f"Preprocessing Copy completed successfully for database: {db_id}")
            result = True
        except Exception as e:
            exec_logger.error(f"Pre-processing Copy {db_id} failed: {e}")
            exec_logger.error(f"Error type: {type(e).__name__}")
            exec_logger.error(f"Error details: {str(e)}")
        finally:
            exec_logger.info(f"[PREPROCESS_ACTOR] preprocess_copy() START: {db_id}")
            return result