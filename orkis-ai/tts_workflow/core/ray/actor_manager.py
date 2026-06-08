import ray
from typing import Any, Optional, List, Type, Dict
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.ray.actor.resource_actor import ResourceActor
from tts_workflow.core.conf.ray_config import ray_config
from tts_workflow.core.conf.config import logger_config


class ActorManager:
    """
    Ray Actor 생명주기 관리

    - ConversationActor: max 3 (ActorPool)
    - LLMActor: 단일 상주 (내부 LRU Pool max 5)
    - EmbeddingActor: 단일 상주 (내부 LRU Pool max 5)
    - FaissActor: 단일 상주 (내부 LRU Pool max 5)
    """

    _conversation_actors: Dict[int, ray.actor.ActorHandle] = dict()
    _preprocess_actors: Dict[int, ray.actor.ActorHandle] = dict()
    _resource_cls: List[ResourceActor] = []

    _initialized: bool = False

    @classmethod
    def init(cls):
        """Ray 및 Actor 초기화"""
        if cls._initialized:
            return

        if not ray.is_initialized():
            ray.init(
                include_dashboard=False
            )

        # LogActor 먼저 생성 (다른 Actor들이 사용)
        cls._create_log_actor()

        for c_actor_ind in range(ray_config.MAX_CONVERSATION_ACTORS):
            cls._create_conversation_actor(index=c_actor_ind)

        for p_actor_ind in range(ray_config.MAX_PREPROCESS_ACTORS):
            cls._create_preprocess_actor(index=p_actor_ind)

        cls.rs_actor:List[str] = list()
        cls._create_resource_actor()
        cls._initialized = True

        exec_logger.info("Ray initialized")


    @classmethod
    def get_log_actor(cls) -> ray.actor.ActorHandle:
        """LogActor 획득"""
        try:
            actor = ray.get_actor(ray_config.LOG_ACTOR_NAME)
        except ValueError:
            raise ValueError(f"Error in Get {ray_config.LOG_ACTOR_NAME}. Try after initializing ray")

        if actor is None:
            raise RuntimeError(f"Faile to load {ray_config.LOG_ACTOR_NAME}")

        return actor
    
    @classmethod
    def get_conversation_actor(cls, index: int = 0) -> ray.actor.ActorHandle:
        """
        ConversationActor 획득/생성

        Args:
            index: Actor 인덱스 (0-2)

        Returns:
            ConversationActor handle
        """
        if index not in cls._conversation_actors:
            raise ValueError("Error in Get Conversation Actor. Try after initializing ray")

        return cls._conversation_actors[index]

    @classmethod
    def get_preprocess_actor(cls, index: int = 0) -> ray.actor.ActorHandle:
        """
        PreprocessActor 획득

        Args:
            index: Actor 인덱스

        Returns:
            PreprocessActor handle
        """
        if index not in cls._preprocess_actors:
            raise ValueError("Error in Get Preprocess Actor. Try after initializing ray")

        return cls._preprocess_actors[index]
        
    @classmethod
    def get_resource_actor(cls, actor_name: str) -> ray.actor.ActorHandle:
        """ResourceActor 획득/생성 (범용)"""
        try:
            actor = ray.get_actor(actor_name)
        except ValueError:
            raise ValueError(f"Error in Get {actor_name}. Try after initializing ray")
        
        if actor is None:
            raise RuntimeError(f"Faile to load {actor_name}")

        return actor
    
    @classmethod
    def _create_log_actor(cls) -> ray.actor.ActorHandle:
        """LogActor 생성 (비동기 로깅용)"""
        from tts_workflow.core.ray.actor.log_actor import LogActor

        # logger_config에서 파일 저장이 필요한 로거만 추출
        actor = LogActor.options(
            name=ray_config.LOG_ACTOR_NAME,
            lifetime="detached",
            max_restarts=-1,
        ).remote({
            name: info
            for name, info in logger_config.logger_infos.items()
            if info.root_save_dir and info.save_fn
        })
    
        if actor is None:
            raise RuntimeError(f"Cannot Created {LogActor}")
        else:
            exec_logger.info(f"LogActor: Created")
            return actor
        
    @classmethod
    def _create_conversation_actor(cls, index: int) -> ray.actor.ActorHandle:
        """ConversationActor 생성"""
        from tts_workflow.app.ray.actor.conversation_actor import ConversationActor

        name = f"conversation_actor_{index}"
        actor = ConversationActor.options(
            name=name,
            # lifetime="detached",
            max_restarts=-1,
        ).remote()

        if actor is None:
            raise RuntimeError(f"Cannot Created ConversationActor[{index}]")
        else:
            exec_logger.info(f"ConversationActor[{index}]: Created")
            cls._conversation_actors[index] = actor
            return actor

    @classmethod
    def _create_preprocess_actor(cls, index: int) -> ray.actor.ActorHandle:
        """PreprocessActor 생성"""
        from tts_workflow.app.ray.actor.preprocess_actor import PreprocessActor

        name = f"preprocess_actor_{index}"
        actor = PreprocessActor.options(
            name=name,
            max_restarts=-1,
        ).remote()

        if actor is None:
            raise RuntimeError(f"Cannot Created PreprocessActor[{index}]")
        else:
            exec_logger.info(f"PreprocessActor[{index}]: Created")
            cls._preprocess_actors[index] = actor
            return actor
        
    @classmethod
    def _create_resource_actor(cls) -> None:

        from tts_workflow.app.ray.actor.llm_actor import LLMActor
        from tts_workflow.app.ray.actor.openai_embedding_actor import OpenAIEmbeddingActor
        from tts_workflow.app.ray.actor.faiss_actor import FaissActor

        for actor_cls in [LLMActor, OpenAIEmbeddingActor, FaissActor]:
            actor = actor_cls.options(
                name=actor_cls.name,
                lifetime="detached",
                max_restarts=-1,
            ).remote(
                max_pool_size=ray_config.LRU_POOL_SIZE,
                ttl_seconds=ray_config.LRU_TTL_SECONDS
            )
        
            if actor is None:
                raise RuntimeError(f"Cannot Created {actor_cls.name}")
            
            cls.rs_actor.append(actor_cls.name)
            exec_logger.info(f"{actor_cls.name}: Created")

    @classmethod
    def kill_conversation_actor(cls, index: int) -> dict:
        """
        ConversationActor 종료 (shutdown -> kill)

        Args:
            index: Actor 인덱스

        Returns:
            shutdown에서 반환된 finalize kwargs dict
        """
        old_actor = cls._conversation_actors[index]
        try:
            exec_logger.info(f"Calling shutdown on ConversationActor[{index}]")
            result = ray.get(old_actor.shutdown.remote())
        except Exception as e:
            exec_logger.error(f"Failed to shutdown ConversationActor[{index}]: {e}")
            raise

        try:
            ray.kill(old_actor)
            exec_logger.info(f"ConversationActor[{index}]: Killed")
        except Exception as e:
            exec_logger.error(f"Failed to kill ConversationActor[{index}]: {e}")
            raise

        return result

    @classmethod
    def recreate_conversation_actor(cls, index: int, finalize_kwargs: dict) -> ray.actor.ActorHandle:
        """
        ConversationActor 재생성 + finalize 호출

        Args:
            index: Actor 인덱스
            finalize_kwargs: shutdown에서 받은 finalize 인자들

        Returns:
            새로 생성된 Actor handle
        """
        new_actor = cls._create_conversation_actor(index)
        new_actor.finalize.remote(**finalize_kwargs)
        return new_actor

    @classmethod
    def get_all_stats(cls) -> dict:
        """모든 Actor 상태 조회"""
        stats = {}

        # Conversation Actors
        for i, actor in cls._conversation_actors.items():
            try:
                stats[f"conversation_{i}"] = ray.get(actor.get_pool_stats.remote())
            except Exception as e:
                stats[f"conversation_{i}"] = {"error": str(e)}

        for actor_name in cls.rs_actor:
            try:
                actor = ray.get_actor(actor_name)
                stats[actor_name] = ray.get(actor.get_pool_stats.remote())
            except Exception as e:
                stats[actor_name] = {"error": str(e)}

        return stats

    @classmethod
    def shutdown(cls):
        """모든 Actor 종료"""
        # Conversation Actors
        for i, actor in cls._conversation_actors.items():
            try:
                ray.kill(actor)
                exec_logger.info(f"ConversationActor[{i}]: Killed")
            except Exception as e:
                exec_logger.warning(f"Failed to kill ConversationActor[{i}]: {e}")
        cls._conversation_actors = dict()

        # Preprocess Actors
        for i, actor in cls._preprocess_actors.items():
            try:
                ray.kill(actor)
                exec_logger.info(f"PreprocessActor[{i}]: Killed")
            except Exception as e:
                exec_logger.warning(f"Failed to kill PreprocessActor[{i}]: {e}")
        cls._preprocess_actors = dict()

        # LogActor 종료
        try:
            log_actor = ray.get_actor(ray_config.LOG_ACTOR_NAME)
            ray.get(log_actor.shutdown.remote())  # flush 대기
            ray.kill(log_actor)
            exec_logger.info("LogActor: Killed")
        except Exception as e:
            exec_logger.warning(f"Failed to kill LogActor: {e}")

        # Other Actors
        for actor_name in cls.rs_actor:
            try:
                actor = ray.get_actor(actor_name)
            except Exception as e:
                actor = None

            if actor:
                try:
                    ray.kill(actor)
                    exec_logger.info(f"{actor_name}: Killed")
                except Exception as e:
                    exec_logger.warning(f"Failed to kill {actor_name}: {e}")
        
        cls._initialized = False


# 편의 함수
def get_log_actor():
    return ActorManager.get_log_actor()

def get_conversation_actor(index: int = 0):
    return ActorManager.get_conversation_actor(index)

def get_preprocess_actor(index: int = 0):
    return ActorManager.get_preprocess_actor(index)

def get_llm_actor():
    from tts_workflow.app.ray.actor.llm_actor import LLMActor
    return ActorManager.get_resource_actor(actor_name=LLMActor.name)

def get_embedding_actor():
    from tts_workflow.app.ray.actor.openai_embedding_actor import OpenAIEmbeddingActor
    return ActorManager.get_resource_actor(actor_name=OpenAIEmbeddingActor.name)

def get_faiss_actor():
    from tts_workflow.app.ray.actor.faiss_actor import FaissActor
    return ActorManager.get_resource_actor(actor_name=FaissActor.name)