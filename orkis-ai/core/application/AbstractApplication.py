from abc import *


class AbstractApplication:
    def __init__(
        self,
        app_root: str = None,
        env_root: str = None,
        env: str = None,
    ) -> None:
        """
        application 환경변수 로딩 순서
        1. os 환경변수
        2. env 파일 위치
        3. 시스템 루트 위치

        로딩 후 상속받은 application 에서 오버라이딩
        """

        pass
