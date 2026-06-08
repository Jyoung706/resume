from typing import Any, Dict, List, Optional
from func_timeout import FunctionTimedOut
from sqlglot import parse_one, exp
from sqlglot.optimizer.qualify import qualify

from tts_workflow.app.vector_search.repository.csv_source_info_repository import CsvSourceInfoRepository
from tts_workflow.app.vector_search.repository.json_source_repository import JsonSourceRepository
from tts_workflow.core.database.utils.schema import ColumnInfo, DatabaseSchema, get_primary_keys
from tts_workflow.core.database.utils.schema_generator import DatabaseSchemaGenerator
from tts_workflow.core.vector_search.constants import ExecutionStatus
from tts_workflow.core.vector_search.service.base_service import BaseService
from tts_workflow.app.utils.logger.exec_logger import exec_logger

class SourceSearchService(BaseService):
    """
    원본 DB 조회 Service
    """

    src_db_repo: JsonSourceRepository
    src_info_repo: CsvSourceInfoRepository

    def get_cached_db_schema(self) -> DatabaseSchema:

        db_schema = DatabaseSchema.from_schema_dict(self.src_db_repo.get_db_schema())

        schema_with_type = {}
        for table_name in db_schema.tables.keys():
            columns = self.src_db_repo.get_table_columns(table_name=table_name)

            schema_with_type[table_name] = {}
            for col in columns:
                schema_with_type[table_name][col.name] = {"type": col.type}
                unique_values = self.src_db_repo.get_unique_cnt(table_name=table_name, column_name=col.name)
                is_categorical = unique_values < 20
                unique_values = None
                if is_categorical:
                    unique_values = self.src_db_repo.get_unique_values(table_name=table_name, column_name=col.name)
                schema_with_type[table_name][col.name].update(
                    {"unique_values": unique_values}
                )
                try:
                    value_statics = self.src_db_repo.get_statics_info(table_name=table_name, column_name=col.name)
                    schema_with_type[table_name][col.name].update(
                        {
                            "value_statics": value_statics
                            if value_statics
                            else None
                        }
                    )
                except Exception as e:
                    exec_logger.error(
                        f"An error occurred while fetching statistics for {col.name} in {table_name}: {e}"
                    )
                    schema_with_type[table_name][col.name].update({"value_statics": None})
        db_schema.set_columns_info(schema_with_type)

        # primary key set
        schema_with_primary_keys = {
            table_name: {
                col: {"primary_key": True}
                for col in self.src_db_repo.get_table_primarykeys(table_name=table_name)
            }
            for table_name in db_schema.tables.keys()
        }
        db_schema.set_columns_info(schema_with_primary_keys)

        # foreign key set
        schema_with_references = {
            table_name: {
                column_name: {"foreign_keys": [], "referenced_by": []}
                for column_name in table_schema.columns.keys()
            }
            for table_name, table_schema in db_schema.tables.items()
        }

        for table_name, columns in schema_with_references.items():
            foreign_keys_info = self.src_db_repo.get_table_foreignkeys(table_name=table_name)

            for fk in foreign_keys_info:
                source_table = table_name
                source_column = db_schema.get_actual_column_name(
                    table_name, fk[3]
                )
                destination_table = db_schema.get_actual_table_name(fk[2])
                destination_column = (
                    get_primary_keys(db_schema.tables[destination_table])[0]
                    if not fk[4]
                    else db_schema.get_actual_column_name(fk[2], fk[4])
                )

                schema_with_references[source_table][source_column][
                    "foreign_keys"
                ].append((destination_table, destination_column))
                schema_with_references[destination_table][destination_column][
                    "referenced_by"
                ].append((source_table, source_column))

        db_schema.set_columns_info(schema_with_references)

        return db_schema

    def get_all_column_example(self, limit:int = 3) -> Dict[str, Dict[str, List[str]]]:
        column_examples = {}

        tables = self.src_db_repo.get_all_tables()
        for table_name in tables:
            column_examples[table_name] = {}
            columns = self.src_db_repo.get_table_columns_name(table_name=table_name)
            for column_name in columns:
                if column_name.lower() == "id":
                    continue
                
                example = self.src_db_repo.get_column_example(table_name=table_name, column_name=column_name, limit=limit)
                if example and len(str(example[0])) <= limit:
                    column_examples[table_name][column_name] = [str(x[0]) for x in example if x and x[0]]
        
        return column_examples
    
    def get_all_ddl_commands(self) -> Dict[str, str]:
        tables = self.src_db_repo.get_all_tables()
        ddl_commands = {}
        for table_name in tables:
            create_prompt = self.src_db_repo.get_ddl_by_table(table_name=table_name)
            ddl_commands[table_name] = create_prompt[0] if create_prompt else ""
        return ddl_commands
    
    def get_tentative_schema(self) -> Dict[str, List[str]]:
        """DB 전체 스키마 조회"""
        return self.src_db_repo.get_db_schema()

    def get_column_profiles(
        self,
        schema_generator: DatabaseSchemaGenerator,
        schema_with_examples: Dict[str, Dict[str, List[str]]],
        use_value_description: bool,
        with_keys: bool,
        with_references: bool,
        tentative_schema: Dict[str, List[str]] = None,
    ) -> Dict[str, Dict[str, str]]:
        """
        컬럼 프로필 생성

        Args:
            schema_generator: DatabaseSchemaGenerator 인스턴스 (상태 저장용)
            schema_with_examples: 예시값 포함 스키마
            use_value_description: value description 포함 여부
            with_keys: key 정보 포함 여부
            with_references: reference 정보 포함 여부
            tentative_schema: 임시 스키마

        Returns:
            Dict[str, Dict[str, str]]: 컬럼 프로필 딕셔너리
        """
        table_names = self.src_db_repo.get_all_tables()

        schema_with_descriptions = {}
        for table_name in table_names:
            try:
                description = self.src_info_repo.load_table_description(
                    table_name=table_name,
                    use_value_description=use_value_description
                )
                schema_with_descriptions[table_name] = description
            except Exception:
                columns = self.src_db_repo.get_table_columns(table_name)
                schema_with_descriptions[table_name] = {
                    col.name: ColumnInfo(original_column_name=col.name, column_name=col.name)
                    for col in columns
                }

        # schema_generator 상태 업데이트 (Python reference이므로 호출자에서도 반영됨)
        schema_generator.set_schema(
            tentative_schema=DatabaseSchema.from_schema_dict(
                tentative_schema if tentative_schema else self.src_db_repo.get_db_schema()
            ),
            schema_with_examples=DatabaseSchema.from_schema_dict_with_examples(
                schema_with_examples
            ),
            schema_with_descriptions=DatabaseSchema.from_schema_dict_with_descriptions(
                schema_with_descriptions
            ),
            all_column_examples=self.get_all_column_example()
        )

        column_profiles = schema_generator.get_column_profiles(
            with_keys, with_references
        )
        return column_profiles

    def get_database_schema_string(
        self,
        schema_generator: DatabaseSchemaGenerator,
        tentative_schema: Dict[str, List[str]],
        schema_with_examples: Dict[str, List[str]],
        schema_with_descriptions: Dict[str, Dict[str, Dict[str, Any]]],
        include_value_description: bool,
    ) -> str:
        """
        데이터베이스 스키마 문자열 생성

        Args:
            schema_generator: DatabaseSchemaGenerator 인스턴스
            tentative_schema: 임시 스키마
            schema_with_examples: 예시값 포함 스키마
            schema_with_descriptions: 설명 포함 스키마
            include_value_description: value description 포함 여부

        Returns:
            str: 생성된 스키마 문자열
        """
        schema_generator.set_schema(
            tentative_schema=DatabaseSchema.from_schema_dict(tentative_schema),
            schema_with_examples=DatabaseSchema.from_schema_dict_with_examples(
                schema_with_examples
            ) if schema_with_examples else None,
            schema_with_descriptions=DatabaseSchema.from_schema_dict_with_descriptions(
                schema_with_descriptions
            ) if schema_with_descriptions else None,
            all_column_examples=self.get_all_column_example()
        )

        schema_string = schema_generator.generate_schema_string(
            include_value_description=include_value_description,
            all_ddl_commands=self.get_all_ddl_commands()
        )
        return schema_string

    def add_connections_to_tentative_schema(
        self,
        schema_generator: DatabaseSchemaGenerator,
        tentative_schema: Dict[str, List[str]]
    ) -> Dict[str, List[str]]:
        """
        임시 스키마에 connection 정보 추가

        Args:
            schema_generator: DatabaseSchemaGenerator 인스턴스
            tentative_schema: 임시 스키마

        Returns:
            Dict[str, List[str]]: connection이 추가된 스키마
        """
        schema_generator.set_schema(
            tentative_schema=DatabaseSchema.from_schema_dict(tentative_schema),
            all_column_examples=self.get_all_column_example()
        )

        return schema_generator.get_schema_with_connections()

    def get_union_schema_dict(
        self,
        schema_dict_list: List[Dict[str, List[str]]]
    ) -> Dict[str, List[str]]:
        """
        스키마 리스트를 union

        Args:
            schema_dict_list: 스키마 딕셔너리 리스트

        Returns:
            Dict[str, List[str]]: union된 스키마
        """
        full_schema = DatabaseSchema.from_schema_dict(self.src_db_repo.get_db_schema())
        actual_name_schemas = []
        for schema in schema_dict_list:
            subselect_schema = full_schema.subselect_schema(
                DatabaseSchema.from_schema_dict(schema)
            )
            schema_dict = subselect_schema.to_dict()
            actual_name_schemas.append(schema_dict)

        union_schema = {}
        for schema in actual_name_schemas:
            for table, columns in schema.items():
                if table not in union_schema:
                    union_schema[table] = columns
                else:
                    union_schema[table] = list(set(union_schema[table] + columns))
        return union_schema

    def get_execution_result(self, sql: str) -> List[Any]:
        """SQL 실행 결과 조회"""
        return self.src_db_repo.execute_query(sql)

    def get_execution_status(
        self, sql: str, execution_result: List[Any] = None
    ) -> str:
        """
        SQL 실행 상태 확인

        Args:
            sql: SQL 쿼리
            execution_result: 이미 실행된 결과 (optional)

        Returns:
            str: ExecutionStatus 상수 값
        """
        if not execution_result:
            try:
                execution_result = self.get_execution_result(sql)
            except FunctionTimedOut:
                return ExecutionStatus.SYNTACTICALLY_INCORRECT
            except Exception:
                return ExecutionStatus.SYNTACTICALLY_INCORRECT

        if isinstance(execution_result, str):
            return ExecutionStatus.SYNTACTICALLY_INCORRECT

        if (execution_result is None) or (execution_result == []):
            return ExecutionStatus.EMPTY_RESULT

        return ExecutionStatus.SYNTACTICALLY_CORRECT

    def get_sql_columns_dict(self, sql: str) -> Dict[str, List[str]]:
        """
        SQL 쿼리에서 테이블/컬럼 딕셔너리 추출

        Args:
            sql: SQL 쿼리 문자열

        Returns:
            Dict[str, List[str]]: {테이블명: [컬럼명, ...]}
        """
        sql_expr = (
            qualify(
                parse_one(sql, read="sqlite"),
                qualify_columns=True,
                validate_qualify_columns=False,
            )
            if isinstance(sql, str)
            else sql
        )
        columns_dict = {}

        sub_queries = [subq for subq in sql_expr.find_all(exp.Subquery) if subq != sql_expr]
        for sub_query in sub_queries:
            subq_columns_dict = self._get_sql_columns_dict_recursive(sub_query)
            for table, columns in subq_columns_dict.items():
                if table not in columns_dict:
                    columns_dict[table] = columns
                else:
                    columns_dict[table].extend(
                        [
                            col
                            for col in columns
                            if col.lower() not in [c.lower() for c in columns_dict[table]]
                        ]
                    )

        for column in sql_expr.find_all(exp.Column):
            column_name = column.name
            table_alias = column.table
            table = self._get_table_with_alias(sql_expr, table_alias) if table_alias else None
            table_name = table.name if table else None

            if not table_name:
                candidate_tables = [
                    t
                    for t in sql_expr.find_all(exp.Table)
                    if self._get_main_parent(t) == self._get_main_parent(column)
                ]
                for candidate_table in candidate_tables:
                    table_columns = self.src_db_repo.get_table_columns_name(candidate_table.name)
                    if column_name.lower() in [col.lower() for col in table_columns]:
                        table_name = candidate_table.name
                        break

            if table_name:
                if table_name not in columns_dict:
                    columns_dict[table_name] = []
                if column_name.lower() not in [c.lower() for c in columns_dict[table_name]]:
                    columns_dict[table_name].append(column_name)

        return columns_dict

    def _get_sql_columns_dict_recursive(self, sql_expr: exp.Expression) -> Dict[str, List[str]]:
        """재귀적으로 SQL 컬럼 딕셔너리 추출 (내부 메서드)"""
        return self.get_sql_columns_dict(sql_expr)

    @staticmethod
    def _get_main_parent(expression: exp.Expression) -> Optional[exp.Expression]:
        """Expression의 main parent 조회"""
        parent = expression.parent
        while parent and not isinstance(parent, exp.Subquery):
            parent = parent.parent
        return parent

    @staticmethod
    def _get_table_with_alias(
        parsed_sql: exp.Expression, alias: str
    ) -> Optional[exp.Table]:
        """alias로 테이블 조회"""
        return next(
            (table for table in parsed_sql.find_all(exp.Table) if table.alias == alias),
            None,
        )
