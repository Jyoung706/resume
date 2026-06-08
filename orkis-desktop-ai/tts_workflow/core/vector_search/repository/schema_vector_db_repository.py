from abc import ABC, abstractmethod
from typing import Dict, List

from tts_workflow.core.vector_search.repository.base_repository import BaseRepository


class SchemaVectorDBRepository(BaseRepository, ABC):
    """
    스키마 벡터 DB 인터페이스 - create/read/delete, stateless

    db_id, api_key는 ExecutorContext에서 자동 획득
    @with_executors 데코레이터로 executor 주입
    """
    @abstractmethod
    def create(self, data: Dict) -> bool:
        """
        벡터 인덱스 생성

        Args:
            data: 인덱싱할 데이터

        Returns:
            bool: 성공 여부
        """
        pass

    @abstractmethod
    def query(self, queries: List[str], top_k: int) -> List[Dict]:
        """
        벡터 검색

        Args:
            queries: 검색 쿼리 리스트
            top_k: 각 쿼리당 반환할 결과 수

        Returns:
            List[Dict]: 검색 결과 리스트
        """
        pass

    @abstractmethod
    def status(self) -> bool:
        """
        벡터 상태 조회
        Returns:
            bool: 상태 (true:정상/false:비정상)
        """
        pass