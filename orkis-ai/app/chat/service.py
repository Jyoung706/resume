from typing import Any, Dict

from app.chat.dto.req import ConversationRequest
from app.application.ray_conversation_manager import ray_conversation_manager
from core.exceptions.base import APIException
from core.exceptions.errors import Errors

from core.server.service.service_base import BaseService

from core.static.llm_model_enum import MODELS
from tts_workflow.core.utils import CommonUtil
from tts_workflow.app.utils.logger.exec_logger import exec_logger

class ChatService(BaseService):
    def __init__(self, *arg, **kwargs):
        super().__init__(*arg, **kwargs)

    async def conversation(
        self,
        req: ConversationRequest,
    ) -> Dict[str, Any]:
        
        if req.chat_id:
            # regacy 호환 용 임시코드
            chat_id = req.chat_id
            exec_logger.info(f"User-defined chat ID: {chat_id}")
        else:
            chat_id = CommonUtil.generate_uuid()
            exec_logger.info(f"AI-defined chat ID: {chat_id}")

        title = None

        if req.generate_title:
            try:
                title = await ray_conversation_manager.execute(
                    lambda actor: actor.get_title,
                    question=req.question,
                    llm_model=MODELS.GPT_5_2,
                    api_key=req.api_key,
                )
            except Exception:
                raise APIException(error=Errors.TITLE_GENRATE_FAILED)

            if title is None:
                raise APIException(error=Errors.TITLE_GENRATE_FAILED)

        task_dict = {
            "chat_id": chat_id,
            "db_id": req.db_id,
            "question": req.question,
            "evidence": req.evidence,
            "topics": req.topics,
            "chatroom_id": req.chatroom_id,
            "worker_id": req.worker_id,
            "llm_model": MODELS.GPT_5_2, # gpt 5_2 로 고정 (임시)
            "api_key": req.api_key,
            "input": req.model_dump(),
        }

        try:
            ray_conversation_manager.submit_task(chat_id, lambda actor: actor.run, task_dict)
        except Exception as e:
            raise APIException(error=Errors.CHAT_EXECUTE_FAILED)

        return {"chat_id": chat_id, "title": title}

    async def cancel(self, chat_id: str) -> bool:
        result = ray_conversation_manager.cancel_task(chat_id)
        if not result:
            raise APIException(error=Errors.CHAT_CANCLE_FAILED)

        return result
