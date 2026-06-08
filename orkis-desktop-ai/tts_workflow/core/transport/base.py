from abc import ABC, abstractmethod


class EventTransport(ABC):
    """워크플로우 이벤트 전송 추상 인터페이스.

    워크플로우는 이 인터페이스만 알고, 실제 전송 방식(Socket, WebSocket, Redis 등)은 모른다.
    """

    @abstractmethod
    async def emit(self, event: str, data: dict) -> None:
        """이벤트 전송"""
        ...

    async def close(self) -> None:
        """리소스 정리 (필요 시 override)"""
        pass
