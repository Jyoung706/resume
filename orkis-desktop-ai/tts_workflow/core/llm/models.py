from typing import Any, List
from collections import deque
from langchain_core.messages import AnyMessage

from tts_workflow.core.worker.dataclass.chat import Chat


def get_history_messages(
    chat_history: List[Chat], engine: Any, invoke_tokens: int, limit: int = 100
) -> List[AnyMessage]:
    """
    # 사용법
    # get_num_tokens_from_messages 에서 메모리 누수 있음

    history_messages = get_history_messages(chat_history, engine, engine.get_num_tokens_from_messages(invoke_messages))
    # 과거 대화 기록 주입
    inject_history = RunnableLambda(
        lambda input: history_messages + prompt.format_messages(**input)
    )

    chain = inject_history | engine
    """
    new_messages = deque()
    max_tokens = engine.max_tokens

    for chat in reversed(chat_history):
        if (
            engine.get_num_tokens_from_messages(new_messages) + invoke_tokens
            > max_tokens + limit
        ):
            new_messages.popleft()
            break

        new_messages.appendleft(chat.message)

    return list(new_messages)
