from typing import Dict

from app.application.ray_preprocess_manager import ray_preprocess_manager
from core.server.service.service_base import BaseService
from core.exceptions.base import APIException
from core.exceptions.errors import Errors

from core.static.rag_enum import RAG_TYPE, DB_TYPE
from tts_workflow.core.utils import CommonUtil


class PreProcessService(BaseService):
    def __init__(self, *arg, **kwargs):
        super().__init__(*arg, **kwargs)

    async def pre_process(
            self,
            type: RAG_TYPE,
            db_type: DB_TYPE,
            db_id: str,
            api_key: str
        ) -> bool:

        try:
            type_list = [RAG_TYPE.SCHEMA, RAG_TYPE.DATA] if type == RAG_TYPE.ALL else [type]

            # type 무관 사전 작업: validate 1회 + NAS → Local 원본 동기화 1회.
            # sync 가 type 별로 호출되면 첫 type 가 만든 vector_db 를 두 번째 type 가 wipe 하는 race 가
            # 발생하므로 반드시 루프 진입 전 단일 호출로 처리한다.
            head_task_dict = {
                "type": type_list[0],
                "db_type": db_type,
                "db_id": db_id,
                "api_key": api_key,
            }

            valid = await ray_preprocess_manager.execute(
                lambda actor: actor.validate_db, head_task_dict
            )
            if not valid:
                raise APIException(error=Errors.DATABASE_NOT_FOUND.format(db_id=db_id))

            await ray_preprocess_manager.execute(
                lambda actor: actor.sync_from_nas, db_id
            )

            for c_type in type_list:
                task_dict = {
                    "type": c_type,
                    "db_type": db_type,
                    "db_id": db_id,
                    "api_key": api_key,
                }

                # 전처리 실행 (큐 통한 호출)
                task_id = CommonUtil.generate_uuid()
                ray_preprocess_manager.submit_task(task_id, lambda actor: actor.preprocess, task_dict)

        except APIException:
            raise
        except Exception as e:
            raise APIException(error=Errors.PREPROCESSING_FAILED)

        return True

    async def pre_process_status(self, type: RAG_TYPE, db_id: str) -> Dict[str, int]:
        try:
            task_dict = {"type": type, "db_id": db_id}
            status = await ray_preprocess_manager.execute(
                lambda actor: actor.preprocess_status, task_dict
            )
        except Exception as e:
            raise APIException(error=Errors.PREPROCESSING_STATUS_FAILED)

        return {"status": status}

    async def pre_process_sample(self, db_id: str) -> Dict[str, int]:
        try:
            result = await ray_preprocess_manager.execute(
                lambda actor: actor.preprocess_copy, db_id
            )
        except Exception as e:
            raise APIException(error=Errors.PREPROCESSING_SAMPLE_FAILED)

        return result
