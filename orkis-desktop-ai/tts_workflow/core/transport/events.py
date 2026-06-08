class WorkflowEvent:
    """워크플로우가 사용하는 이벤트명 상수.

    Transport 구현체가 필요 시 프로토콜별 매핑(EVENT_MAP)으로 변환.
    """

    # Chat
    CHAT_TYPE = "chat:type"
    CHAT_TOKEN = "chat:token"
    CHAT_STEPS = "chat:steps"
    CHAT_STEP_UPDATE = "chat:step:update"
    CHAT_COMPLETE = "chat:complete"
    CHAT_ERROR = "chat:error"
    CHAT_TITLE = "chat:title"
    # LLM 호출 경계 (Cloud의 stream_start/stream_end와 동일 타이밍)
    # 여러 LLM 호출의 토큰을 msg_id로 분리하기 위한 경계 신호
    CHAT_LLM_START = "chat:llm:start"
    CHAT_LLM_END = "chat:llm:end"

    # Preprocess
    PREPROCESS_PROGRESS = "preprocess:progress"
    PREPROCESS_COMPLETE = "preprocess:complete"
    PREPROCESS_ERROR = "preprocess:error"
