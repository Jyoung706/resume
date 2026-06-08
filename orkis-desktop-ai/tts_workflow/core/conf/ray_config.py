from pydantic_settings import BaseSettings
import os


class RayConfig(BaseSettings):
    # LogActor 설정
    LOG_ACTOR_NAME: str = "log_actor"
    LOG_ACTOR_NUM_CPUS: float = 0.1
    LOG_ACTOR_MEMORY_MB: int = 50
    LOG_FILE_BUFFER_SIZE: int = 8192

    # ConversationActor 설정
    CONVERSATION_ACTOR_NUM_CPUS: float = 0.5
    CONVERSATION_ACTOR_MEMORY_MB: int = 512
    MAX_CONVERSATION_ACTORS: int = 2

    # PreprocessActor 설정
    PREPROCESS_ACTOR_NUM_CPUS: float = 0.5
    PREPROCESS_ACTOR_MEMORY_MB: int = 512
    MAX_PREPROCESS_ACTORS: int = 2

    # LLMActor 설정
    LLM_ACTOR_NUM_CPUS: float = 0.5
    LLM_ACTOR_MEMORY_MB: int = 256

    # OpenAIEmbeddingActor 설정
    EMBEDDING_ACTOR_NUM_CPUS: float = 0.5
    EMBEDDING_ACTOR_MEMORY_MB: int = 256

    # FaissActor 설정
    FAISS_ACTOR_NUM_CPUS: float = 0.5
    FAISS_ACTOR_MEMORY_MB: int = 512

    # ResourceActor 공통 설정
    LRU_POOL_SIZE: int = 5
    LRU_TTL_SECONDS: float = 1800.0


class DevRayConfig(RayConfig):
    # LogActor 설정
    LOG_ACTOR_NAME: str = os.getenv("LOG_ACTOR_NAME", "log_actor")
    LOG_ACTOR_NUM_CPUS: float = float(os.getenv("LOG_ACTOR_NUM_CPUS", "0"))
    LOG_ACTOR_MEMORY_MB: int = int(os.getenv("LOG_ACTOR_MEMORY_MB", "256"))
    LOG_FILE_BUFFER_SIZE: int = int(os.getenv("LOG_FILE_BUFFER_SIZE", "8192"))

    # ConversationActor 설정
    CONVERSATION_ACTOR_NUM_CPUS: float = float(os.getenv("CONVERSATION_ACTOR_NUM_CPUS", "0"))
    CONVERSATION_ACTOR_MEMORY_MB: int = int(os.getenv("CONVERSATION_ACTOR_MEMORY_MB", "256"))
    MAX_CONVERSATION_ACTORS: int = int(os.getenv("MAX_CONVERSATION_ACTORS", "2"))

    # PreprocessActor 설정
    PREPROCESS_ACTOR_NUM_CPUS: float = float(os.getenv("PREPROCESS_ACTOR_NUM_CPUS", "0"))
    PREPROCESS_ACTOR_MEMORY_MB: int = int(os.getenv("PREPROCESS_ACTOR_MEMORY_MB", "256"))
    MAX_PREPROCESS_ACTORS: int = int(os.getenv("MAX_PREPROCESS_ACTORS", "2"))


    # LLMActor 설정
    LLM_ACTOR_NUM_CPUS: float = float(os.getenv("LLM_ACTOR_NUM_CPUS", "0.5"))
    LLM_ACTOR_MEMORY_MB: int = int(os.getenv("LLM_ACTOR_MEMORY_MB", "256"))

    # OpenAIEmbeddingActor 설정
    EMBEDDING_ACTOR_NUM_CPUS: float = float(os.getenv("EMBEDDING_ACTOR_NUM_CPUS", "0"))
    EMBEDDING_ACTOR_MEMORY_MB: int = int(os.getenv("EMBEDDING_ACTOR_MEMORY_MB", "256"))

    # FaissActor 설정
    FAISS_ACTOR_NUM_CPUS: float = float(os.getenv("FAISS_ACTOR_NUM_CPUS", "0"))
    FAISS_ACTOR_MEMORY_MB: int = int(os.getenv("FAISS_ACTOR_MEMORY_MB", "256"))

    # ResourceActor 공통 설정
    LRU_POOL_SIZE: int = int(os.getenv("LRU_POOL_SIZE", "5"))
    LRU_TTL_SECONDS: float = float(os.getenv("LRU_TTL_SECONDS", "1800.0"))


ray_config = DevRayConfig()
