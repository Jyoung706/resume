from abc import ABC, abstractmethod
from typing import Dict, TYPE_CHECKING

from tts_workflow.core.vector_search.repository.base_repository import BaseRepository

if TYPE_CHECKING:
    from tts_workflow.core.database.utils.schema import ColumnInfo


class SourceInfoRepository(BaseRepository, ABC):
    """
    DB 상세 정보 인터페이스 - read only, stateless

    db_id는 ExecutorContext에서 자동 획득
    @with_executors 데코레이터로 executor 주입
    """

    @abstractmethod
    def load_table_description(
        self,
        table_name: str,
        use_value_description: bool = True
    ) -> Dict[str, "ColumnInfo"]:
        """
        테이블의 컬럼 설명 정보 로드

        Args:
            table_name: 테이블명
            use_value_description: value_description 포함 여부

        Returns:
            Dict[str, ColumnInfo]: {컬럼명: ColumnInfo} 딕셔너리
        """
        pass
