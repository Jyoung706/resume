import re
import logging
import random
from typing import Any, Dict, List, Optional

from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.database.utils.schema import DatabaseSchema, get_primary_keys


class DatabaseSchemaGenerator:
    """
    Generates database schema with optional examples and descriptions.

    Attributes:
        db_id (str): The database identifier.
        db_path (str): The path to the database file.
        add_examples (bool): Flag to indicate whether to add examples.
        schema_structure (DatabaseSchema): The base sfchema structure.
        schema_with_examples (DatabaseSchema): The schema including examples.
        schema_with_descriptions (DatabaseSchema): The schema including descriptions.
    """

    def __init__(
        self,
        tentative_schema: Optional[DatabaseSchema] = None,
        schema_with_examples: Optional[DatabaseSchema] = None,
        schema_with_descriptions: Optional[DatabaseSchema] = None,
        add_examples: bool = True,
        cached_db_schema:DatabaseSchema = None,
        all_column_examples:Optional[Dict[str, Dict[str, List[str]]]] = None
    ):
        self.add_examples = add_examples
        self.CACHED_DB_SCHEMA:DatabaseSchema = cached_db_schema # 초기 DB 캐시 설정
        
        self.schema_structure = tentative_schema or DatabaseSchema()
        self.schema_with_examples = schema_with_examples or DatabaseSchema()
        self.schema_with_descriptions = schema_with_descriptions or DatabaseSchema()

        self._initialize_schema_structure(all_column_examples)

    def set_schema(
        self,
        tentative_schema: Optional[DatabaseSchema] = None,
        schema_with_examples: Optional[DatabaseSchema] = None,
        schema_with_descriptions: Optional[DatabaseSchema] = None,
        all_column_examples:Optional[Dict[str, Dict[str, List[str]]]] = None
    ):
        self.schema_structure = tentative_schema or DatabaseSchema()
        self.schema_with_examples = schema_with_examples or DatabaseSchema()
        self.schema_with_descriptions = schema_with_descriptions or DatabaseSchema()
        self._initialize_schema_structure(all_column_examples)

    def _initialize_schema_structure(self, all_column_examples:Optional[Dict[str, Dict[str, List[str]]]] = None) -> None:
        """
        Initializes the schema structure with table and column info, examples, and descriptions.
        """
        self._load_table_and_column_info()
        self._load_column_examples(all_column_examples)
        self._load_column_descriptions()

    def _load_table_and_column_info(self) -> None:
        """
        Loads table and column information from cached schema.
        """
        self.schema_structure = self.CACHED_DB_SCHEMA.subselect_schema(self.schema_structure)
        self.schema_structure.add_info_from_schema(
            schema=self.CACHED_DB_SCHEMA,
            field_names=["type", "primary_key", "foreign_keys", "referenced_by"],
        )

    def _load_column_examples(self, all_column_examples:Optional[Dict[str, Dict[str, List[str]]]] = None) -> None:
        """
        Loads examples for columns in the schema.
        """
        self.schema_structure.add_info_from_schema(
            schema=self.schema_with_examples, field_names=["examples"]
        )

        for table_name, table_schema in self.schema_structure.tables.items():
            for column_name, column_info in table_schema.columns.items():
                if not column_info.examples:
                    examples = (
                        self.CACHED_DB_SCHEMA
                        .get_column_info(table_name, column_name)
                        .unique_values
                    )
                    if examples:
                        column_info.examples = examples[:5]

                if (self.add_examples and not column_info.examples) or (
                    (column_info.type.lower()) == "date"
                    or ("date" in column_name.lower())
                ):
                    examples = all_column_examples[table_name].get(column_name, None)
                    if examples:
                        column_info.examples = examples

                if not column_info.value_statics:
                    value_statics = (
                        self.CACHED_DB_SCHEMA
                        .get_column_info(table_name, column_name)
                        .value_statics
                    )
                    if value_statics:
                        column_info.value_statics = value_statics

    def _load_column_descriptions(self) -> None:
        """
        Loads descriptions for columns in the schema.
        """
        self.schema_structure.add_info_from_schema(
            self.schema_with_descriptions,
            field_names=[
                "original_column_name",
                "column_name",
                "column_description",
                "data_format",
                "value_description",
            ],
        )

    def _extract_create_ddl_commands(self, all_ddl_commands:Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """
        Extracts DDL commands to create tables in the schema.

        Returns:
            Dict[str, str]: A dictionary mapping table names to their DDL commands.
        """
        ddl_commands = {}
        for table_name in self.schema_structure.tables.keys():
            ddl_commands[table_name] = all_ddl_commands.get(table_name, "")
        return ddl_commands

    @staticmethod
    def _separate_column_definitions(column_definitions: str) -> List[str]:
        """
        Separates column definitions in a DDL command.

        Args:
            column_definitions (str): The column definitions as a single string.

        Returns:
            List[str]: A list of individual column definitions.
        """
        paranthesis_open = 0
        start_position = 0
        definitions = []
        for index, char in enumerate(column_definitions):
            if char == "(":
                paranthesis_open += 1
            elif char == ")":
                paranthesis_open -= 1
            if paranthesis_open == 0 and char == ",":
                definitions.append(column_definitions[start_position:index].strip())
                start_position = index + 1
        definitions.append(column_definitions[start_position:].strip())
        return definitions

    def _is_connection(self, table_name: str, column_name: str) -> bool:
        """
        Checks if a column is a connection (primary key or foreign key).

        Args:
            table_name (str): The name of the table.
            column_name (str): The name of the column.

        Returns:
            bool: True if the column is a connection, False otherwise.
        """
        column_info = self.CACHED_DB_SCHEMA.get_column_info(
            table_name, column_name
        )
        if column_info is None:
            return False
        if column_info.primary_key:
            return True
        for target_table, _ in column_info.foreign_keys:
            if self.schema_structure.get_table_info(target_table):
                return True
        for target_table, _ in column_info.referenced_by:
            if self.schema_structure.get_table_info(target_table):
                return True
        for target_table_name, table_schema in self.schema_structure.tables.items():
            if table_name.lower() == target_table_name.lower():
                continue
            for target_column_name, target_column_info in table_schema.columns.items():
                if (
                    target_column_name.lower() == column_name.lower()
                    and target_column_info.primary_key
                ):
                    return True
        return False

    def _get_connections(self) -> Dict[str, List[str]]:
        """
        Retrieves connections between tables in the schema.

        Returns:
            Dict[str, List[str]]: A dictionary mapping table names to lists of connected columns.
        """
        connections = {}
        for table_name, table_schema in self.schema_structure.tables.items():
            connections[table_name] = []
            for column_name, column_info in (
                self.CACHED_DB_SCHEMA.tables[table_name].columns.items()
            ):
                if self._is_connection(table_name, column_name):
                    connections[table_name].append(column_name)
        return connections

    def get_schema_with_connections(self) -> Dict[str, List[str]]:
        """
        Gets schema with connections included.

        Returns:
            Dict[str, List[str]]: The schema with connections included.
        """
        schema_structure_dict = self.schema_structure.to_dict()
        connections = self._get_connections()
        for table_name, connected_columns in connections.items():
            for column_name in connected_columns:
                if column_name.lower() not in [
                    col.lower() for col in schema_structure_dict[table_name]
                ]:
                    schema_structure_dict[table_name].append(column_name)
        return schema_structure_dict

    def _get_example_column_name_description(
        self, table_name: str, column_name: str, include_value_description: bool = True
    ) -> str:
        """
        Retrieves example values and descriptions for a column.

        Args:
            table_name (str): The name of the table.
            column_name (str): The name of the column.
            include_value_description (bool): Flag to include value description.

        Returns:
            str: The example values and descriptions for the column.
        """
        example_part = ""
        name_string = ""
        description_string = ""
        value_statics_string = ""
        value_description_string = ""

        column_info = self.schema_structure.get_column_info(table_name, column_name)
        if column_info:
            if column_info.examples:
                example_part = f" Example Values: {', '.join([f'`{str(x)}`' for x in column_info.examples])}"
            if column_info.value_statics:
                value_statics_string = f" Value Statics: {column_info.value_statics}"
            if column_info.column_name:
                if (column_info.column_name.lower() != column_name.lower()) and (
                    column_info.column_name.strip() != ""
                ):
                    name_string = f"| Column Name Meaning: {column_info.column_name}"
            if column_info.column_description:
                description_string = (
                    f"| Column Description: {column_info.column_description}"
                )
            if column_info.value_description and include_value_description:
                value_description_string = (
                    f"| Value Description: {column_info.value_description}"
                )

        description_part = (
            f"{name_string} {description_string} {value_description_string}"
        )
        joint_string = (
            f" --{example_part} |{value_statics_string} {description_part}"
            if example_part and description_part
            else f" --{example_part or description_part or value_statics_string}"
        )
        if joint_string == " --":
            joint_string = ""
        return joint_string.replace("\n", " ") if joint_string else ""

    def generate_schema_string(
        self,
        include_value_description: bool = True,
        shuffle_cols: bool = True,
        shuffle_tables: bool = True,
        all_ddl_commands:Optional[Dict[str, str]] = None
    ) -> str:
        """
        Generates a schema string with descriptions and examples.

        Args:
            include_value_description (bool): Flag to include value descriptions.

        Returns:
            str: The generated schema string.
        """
        ddl_commands = self._extract_create_ddl_commands(all_ddl_commands)
        if shuffle_tables:
            ddl_tables = list(ddl_commands.keys())
            random.shuffle(ddl_tables)
            ddl_commands = {
                table_name: ddl_commands[table_name] for table_name in ddl_tables
            }
            # ddl_commands = dict(random.sample(ddl_commands.items(), len(ddl_commands)))
        for table_name, ddl_command in ddl_commands.items():
            ddl_command = re.sub(r"\s+", " ", ddl_command.strip())
            create_table_match = re.match(
                r'CREATE TABLE "?`?([\w -]+)`?"?\s*\((.*)\)', ddl_command, re.DOTALL
            )
            table = create_table_match.group(1).strip()
            if table != table_name:
                logging.warning(f"Table name mismatch: {table} != {table_name}")
            column_definitions = create_table_match.group(2).strip()
            targeted_columns = self.schema_structure.tables[table_name].columns
            schema_lines = [f"CREATE TABLE {table_name}", "("]
            definitions = DatabaseSchemaGenerator._separate_column_definitions(
                column_definitions
            )
            if shuffle_cols:
                definitions = random.sample(definitions, len(definitions))
            for column_def in definitions:
                column_def = column_def.strip()
                if any(
                    keyword in column_def.lower()
                    for keyword in ["foreign key", "primary key"]
                ):
                    if "primary key" in column_def.lower():
                        new_column_def = f"\t{column_def},"
                        schema_lines.append(new_column_def)
                    if "foreign key" in column_def.lower():
                        for t_name in self.schema_structure.tables.keys():
                            if t_name.lower() in column_def.lower():
                                new_column_def = f"\t{column_def},"
                                schema_lines.append(new_column_def)
                else:
                    if column_def.startswith("--"):
                        continue
                    if column_def.startswith("`"):
                        column_name = column_def.split("`")[1]
                    elif column_def.startswith('"'):
                        column_name = column_def.split('"')[1]
                    else:
                        column_name = column_def.split(" ")[0]

                    if (column_name in targeted_columns) or self._is_connection(
                        table_name, column_name
                    ):
                        new_column_def = f"\t{column_def},"
                        new_column_def += self._get_example_column_name_description(
                            table_name, column_name, include_value_description
                        )
                        schema_lines.append(new_column_def)
                    elif column_def.lower().startswith("unique"):
                        new_column_def = f"\t{column_def},"
                        schema_lines.append(new_column_def)
            schema_lines.append(");")
            ddl_commands[table_name] = "\n".join(schema_lines)
        return "\n\n".join(ddl_commands.values())

    def get_column_profiles(
        self, with_keys: bool = False, with_references: bool = False
    ) -> Dict[str, Dict[str, str]]:
        """
        Retrieves profiles for columns in the schema.
        The output is a dictionary with table names as keys mapping to dictionaries with column names as keys and column profiles as values.

        Args:
            with_keys (bool): Flag to include primary keys and foreign keys.
            with_references (bool): Flag to include referenced columns.

        Returns:
            Dict[str, Dict[str, str]]: The column profiles.
        """
        column_profiles = {}
        for table_name, table_schema in self.schema_structure.tables.items():
            column_profiles[table_name] = {}
            for column_name, column_info in table_schema.columns.items():
                if with_keys or not (
                    column_info.primary_key
                    or column_info.foreign_keys
                    or column_info.referenced_by
                ):
                    column_profile = f"Table name: `{table_name}`\nOriginal column name: `{column_name}`\n"
                    if (
                        column_info.column_name.lower().strip()
                        != column_name.lower().strip()
                    ) and (column_info.column_name.strip() != ""):
                        column_profile += (
                            f"Expanded column name: `{column_info.column_name}`\n"
                        )
                    if column_info.type:
                        column_profile += f"Data type: {column_info.type}\n"
                    if column_info.column_description:
                        column_profile += (
                            f"Description: {column_info.column_description}\n"
                        )
                    if column_info.value_description:
                        column_profile += (
                            f"Value description: {column_info.value_description}\n"
                        )
                    if column_info.examples:
                        column_profile += f"Example of values in the column: {', '.join([f'`{str(x)}`' for x in column_info.examples])}\n"
                    if column_info.primary_key:
                        column_profile += "This column is a primary key.\n"
                    if with_references:
                        if column_info.foreign_keys:
                            column_profile += (
                                "This column references the following columns:\n"
                            )
                            for target_table, target_column in column_info.foreign_keys:
                                column_profile += f"    Table: `{target_table}`, Column: `{target_column}`\n"
                        if column_info.referenced_by:
                            column_profile += (
                                "This column is referenced by the following columns:\n"
                            )
                            for (
                                source_table,
                                source_column,
                            ) in column_info.referenced_by:
                                column_profile += f"    Table: `{source_table}`, Column: `{source_column}`\n"
                    column_profiles[table_name][column_name] = column_profile
        return column_profiles
