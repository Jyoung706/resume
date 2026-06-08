from typing import Dict, List



from core.static.rag_enum import RAG_STAT, RAG_TYPE
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.app.vector_search.repository.faiss_lsh_data_repository import FaissLSHDataRepository
from tts_workflow.app.vector_search.repository.json_source_repository import JsonSourceRepository
from tts_workflow.app.vector_search.repository.sqlite_source_repository import SqliteSourceRepository
from tts_workflow.app.vector_search.repository.csv_source_info_repository import CsvSourceInfoRepository
from tts_workflow.app.vector_search.repository.faiss_schema_repository import FaissSchemaRepository
from tts_workflow.core.vector_search.service.base_service import BaseService
from tts_workflow.core.vector_search.exceptions import DataNotFoundError, PreprocessingError
from tts_workflow.core.database.utils.schema import ColumnInfo

class FaissPreprocessService(BaseService):
    src_db_repo:SqliteSourceRepository
    src_info_repo: CsvSourceInfoRepository
    data_vec_repo:FaissLSHDataRepository
    schema_vec_repo:FaissSchemaRepository
    src_schema_info_repo:JsonSourceRepository
    
    def schema_preprocess(self) -> bool:
        """
        Schema Vector Search 를 위한 전처리 수행
        Args:
        Returns:
            bool: 전처리 성공 여부
        """
        try:
            # 스키마 정보 전체 json 저장
            exec_logger.info("Saving full schema information as JSON")
            schema_info = self._extract_schema_info()

            if not schema_info:
                raise DataNotFoundError("No tables found in the source database")
            
            self.src_schema_info_repo.create(data=schema_info)

            # 원본 DB 에서 테이블 목록 가져오기
            exec_logger.info(f"Found {len(schema_info.keys())} tables: {list(schema_info.keys())}")

            # table 정보 추출
            exec_logger.info("Loading table descriptions")
            tables_description = {}
            for table_name in schema_info.keys():
                try:
                    description = self.src_info_repo.load_table_description(table_name=table_name)
                    tables_description[table_name] = description
                except Exception as e:
                    exec_logger.warning(f"Failed to load description for table {table_name}: {str(e)}")
                    tables_description[table_name] = {col.name:ColumnInfo(original_column_name=col.name, column_name=col.name) for col in self.src_db_repo.get_table_columns(table_name)}

            # Vector DB 생성
            exec_logger.info("Creating Vector DB for context information")
            try:
                self.schema_vec_repo.create(tables_description=tables_description)
            except Exception as e:
                exec_logger.error(f"Failed to create Vector DB: {str(e)}")
                raise PreprocessingError(f"Vector DB creation failed: {str(e)}") from e
            
            exec_logger.info("Preprocessing completed successfully")
            return True
        
        except Exception as e:
            exec_logger.error(f"Unexpected error during preprocessing: {str(e)}")
            return False
        
    def data_preprocess(
        self,
        **kwargs
    ) -> bool:
        """
        Data Vector Search 를 위한 전처리 수행
        Args:
        Returns:
            bool: 전처리 성공 여부
        """
        try:
            # 원본 DB 에서 테이블 목록 가져오기
            exec_logger.info("Fetching table names from source database")
            table_names = self.src_db_repo.get_all_tables()

            if not table_names:
                raise DataNotFoundError("No Tables found in the source database")
            
            value_exist = False
            for table_name in table_names:
                try:
                    value_cnt = self.src_db_repo.get_value_cnt(table_name=table_name)
                    if value_cnt:
                        value_exist = True
                        break
                except Exception as e:
                    exec_logger.warning(f"Failed to load value cnt for table {table_name}: {str(e)}")
            
            if not value_exist:
                raise DataNotFoundError("No Values found in the source database")
            
            exec_logger.info(f"Found {len(table_names)} tables: {table_names}")

            # 고유값 추출
            exec_logger.info("Extracting unique values from tables")
            unique_values = self._extract_unique_values(table_names=table_names)

            if not unique_values:
                exec_logger.warning("No unique values extracted from database")

            # LSH 생성
            exec_logger.info("Creating LSH index for entity information")
            try:
                self.data_vec_repo.create(unique_values=unique_values)
            except Exception as e:
                exec_logger.error(f"Failed to create LSH index: {str(e)}")
                raise PreprocessingError(f"LSH creation failed: {str(e)}") from e

            exec_logger.info("Preprocessing completed successfully")
            return True
        
        except Exception as e:
            exec_logger.error(f"Unexpected error during preprocessing: {str(e)}")
            return False
    
    def status(self, type:RAG_TYPE) -> RAG_STAT:
        match type:
            case RAG_TYPE.SCHEMA:
                result = self.schema_vec_repo.status()
            case RAG_TYPE.DATA:
                result = self.data_vec_repo.status()
            case _:
                result = False
        
        if result:
            return RAG_STAT.SUCCESS
        else:
            return RAG_STAT.ERROR        

    def validate_source_db(self) -> bool:
        rs = self.src_db_repo.execute_query("SELECT 1")
        
        if rs[0][0] != 1:
            exec_logger.error(f"Wrong Output By source DB: {rs[0][0]}")
            return False

        return True
    
    def _extract_schema_info(self) -> Dict[str, List[str]]:
        """
        스키마 정보 추출
        Args:
        Returns:
            Dict[str, List[str]]: 테이블별 컬럼 리스트 딕셔너리
        """

        schema_info = {}

        for table_name in self.src_db_repo.get_all_tables():
            schema_info[table_name] = {}
            schema_info[table_name]["__metadata__"] = {
                "primary_keys": self.src_db_repo.get_table_primarykeys(table_name),
                "foreign_keys": self.src_db_repo.get_table_foreignkeys(table_name),
                "value_cnt": self.src_db_repo.get_value_cnt(table_name),
                "ddl": self.src_db_repo.get_ddl_by_table(table_name)
            }

            for column in self.src_db_repo.get_table_columns(table_name):
                schema_info[table_name][column.name] = {
                    "id": column.cid,
                    "type": column.type,
                    "notnull": column.notnull,
                    "dflt_value": column.dflt_value,
                    "pk": column.pk,
                    "unique_values": self.src_db_repo.get_unique_values(table_name, column.name),
                    "unique_cnt": self.src_db_repo.get_unique_cnt(table_name, column.name),
                    "statics_info": self.src_db_repo.get_statics_info(table_name, column.name),
                    "column_example": self.src_db_repo.get_column_example(table_name, column.name, limit=50),
                }

        return schema_info

    def _extract_unique_values(self, table_names:List[str]) -> Dict[str, Dict[str, List[str]]]:
        """
        고유값 추출
        Args:
            table_names (List[str]): 테이블명 리스트
        Returns:
            Dict[str, Dict[str, List[str]]]: 테이블별 컬럼별 고유값 딕셔너리
        """

        try:
            primary_keys = []
            for table_name in table_names:
                try:
                    pks = self.src_db_repo.get_table_primarykeys(table_name)
                    primary_keys.extend(pks)
                except Exception as e:
                    exec_logger.warning(f"Failed to get primary keys for table {table_name}: {str(e)}")

            unique_values: Dict[str, Dict[str, List[str]]] = {}
            for table_name in table_names:
                try:
                    columns_info = self.src_db_repo.get_table_columns(table_name)
                    columns = [
                        col.name 
                        for col in columns_info
                        if (
                            "text" in col.type.lower() 
                            and col.name.lower() not in [pk.lower() for pk in primary_keys]
                            )
                    ]
                except Exception as e:
                    exec_logger.error(f"Failed to get columns for table {table_name}: {str(e)}")
                    continue

                table_values: Dict[str, List[str]] = {}

                for column in columns:
                    try:
                        if any(
                            keyword in column.lower()
                            for keyword in [
                                "_id",
                                " id",
                                "url",
                                "email",
                                "web",
                                "time",
                                "phone",
                                "date",
                                "address",
                            ]
                        ) or column.endswith("Id"):
                            continue
                        
                        sum_of_lengths, count_distinct = self.src_db_repo.get_unique_info(table_name, column)
                        
                        if count_distinct == 0:
                            exec_logger.debug(f"Column {column} has no distinct values, skipping")
                            continue
                            
                        average_length = sum_of_lengths / count_distinct

                        exec_logger.debug(
                            f"Column: {column}, sum_of_lengths: {sum_of_lengths}, count_distinct: {count_distinct}, average_length: {average_length}"
                        )

                        if (
                            ("name" in column.lower() and sum_of_lengths < 5000000)
                            or (sum_of_lengths < 2000000 and average_length < 25)
                            or count_distinct < 100
                        ):
                            exec_logger.debug(f"Fetching distinct values for {column}")
                            values = self.src_db_repo.get_unique_values(table_name, column)

                            exec_logger.debug(f"Number of different values: {len(values)}")
                            table_values[column] = values
                            
                    except Exception as e:
                        exec_logger.error(f"Failed to process column {table_name}.{column}: {str(e)}")
                        continue
                    
                unique_values[table_name] = table_values
            
            return unique_values
            
        except Exception as e:
            exec_logger.error(f"Failed to extract unique values: {str(e)}")
            raise PreprocessingError(f"Unique value extraction failed: {str(e)}") from e