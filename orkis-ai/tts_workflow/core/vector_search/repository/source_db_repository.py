from abc import ABC, abstractmethod
from typing import Any, Dict, List, Tuple, TYPE_CHECKING

from tts_workflow.core.vector_search.repository.base_repository import BaseRepository

if TYPE_CHECKING:
    from tts_workflow.core.database.utils.schema import ColumnDB


class SourceDBRepository(BaseRepository, ABC):
    """
    원본 DB 인터페이스 - read only, stateless

    db_id는 ExecutorContext에서 자동 획득
    @with_executors 데코레이터로 executor 주입
    """

    @abstractmethod
    def get_db_schema(self) -> Dict[str, List[str]]:
        """
        DB 전체 스키마 조회 (테이블명 -> 컬럼명 리스트)

        Returns:
            Dict[str, List[str]]: {테이블명: [컬럼명, ...]}
        """
        pass

    @abstractmethod
    def get_all_tables(self) -> List[str]:
        """
        DB내 전체 테이블명 조회

        Returns:
            List[str]: 테이블명 리스트
        """
        pass

    @abstractmethod
    def get_table_columns(self, table_name: str) -> List["ColumnDB"]:
        """
        테이블의 전체 컬럼 정보 조회

        Args:
            table_name: 테이블명

        Returns:
            List[ColumnDB]: 컬럼 정보 리스트
        """
        pass

    @abstractmethod
    def get_table_columns_name(self, table_name: str) -> List[str]:
        """
        테이블의 전체 컬럼명 조회

        Args:
            table_name: 테이블명

        Returns:
            List[str]: 컬럼명 리스트
        """
        pass

    @abstractmethod
    def get_table_primarykeys(self, table_name: str) -> List[str]:
        """
        테이블의 Primary Key 컬럼명 조회

        Args:
            table_name: 테이블명

        Returns:
            List[str]: PK 컬럼명 리스트
        """
        pass

    @abstractmethod
    def get_table_foreignkeys(self, table_name: str) -> List[Tuple]:
        """
        테이블의 Foreign Key 정보 조회

        Args:
            table_name: 테이블명

        Returns:
            List[Tuple]: FK 정보 리스트
        """
        pass

    def get_unique_info(self, table_name: str, column_name: str) -> Tuple[int, int]:
        """
        컬럼의 고유값 길이/갯수 조회

        Args:
            table_name: 테이블명
            column_name: 컬럼명

        Returns:
            Tuple[int, int]: (고유값 길이 합, 고유값 갯수)
        """
        pass

    @abstractmethod
    def get_unique_values(self, table_name: str, column_name: str) -> List[str]:
        """
        컬럼의 고유값 리스트 조회

        Args:
            table_name: 테이블명
            column_name: 컬럼명

        Returns:
            List[str]: 고유값 리스트
        """
        pass

    @abstractmethod
    def get_unique_cnt(self, table_name: str, column_name: str, limit: int = 21) -> int:
        """
        컬럼의 고유값 갯수 조회 (limit 적용)

        Args:
            table_name: 테이블명
            column_name: 컬럼명
            limit: 최대 조회 갯수

        Returns:
            int: 고유값 갯수
        """
        pass

    @abstractmethod
    def get_value_cnt(self, table_name: str) -> int:
        """
        테이블의 전체 행 수 조회

        Args:
            table_name: 테이블명

        Returns:
            int: 행 수
        """
        pass

    @abstractmethod
    def get_statics_info(self, table_name: str, column_name: str, limit: int = 21) -> Any:
        """
        컬럼의 통계 정보 조회

        Args:
            table_name: 테이블명
            column_name: 컬럼명
            limit: 최대 조회 갯수

        Returns:
            Any: 통계 정보 문자열
        """
        pass

    @abstractmethod
    def get_column_example(self, table_name: str, column_name: str, limit: int = 3) -> List[Any]:
        """
        컬럼의 예시 값 조회

        Args:
            table_name: 테이블명
            column_name: 컬럼명
            limit: 최대 조회 갯수

        Returns:
            List[Any]: 예시 값 리스트
        """
        pass

    @abstractmethod
    def get_ddl_by_table(self, table_name: str) -> Any:
        """
        테이블의 DDL 조회

        Args:
            table_name: 테이블명

        Returns:
            Any: DDL 문자열
        """
        pass

    def execute_query(self, sql: str) -> List[Any]:
        """
        SQL 쿼리 실행

        Args:
            sql: 실행할 SQL

        Returns:
            List[Any]: 쿼리 결과
        """
        pass
