from typing import Dict

import pandas as pd

from tts_workflow.app.vector_search.executor.csv_reader import CsvReader
from tts_workflow.core.database.utils.schema import ColumnInfo
from tts_workflow.core.vector_search.executor.config import ExecutorConfig
from tts_workflow.core.vector_search.repository.source_info_repository import SourceInfoRepository


class CsvSourceInfoRepository(SourceInfoRepository):
    """CSV 기반 SourceInfo 구현체 - Stateless"""

    csv = ExecutorConfig(CsvReader)

    def load_table_description(
        self,
        table_name: str,
        use_value_description: bool = True,
    ) -> Dict[str, ColumnInfo]:
        """
        CSV 파일에서 테이블 설명 로드

        Args:
            table_name: 테이블명
            use_value_description: value description 포함 여부

        Returns:
            Dict[str, ColumnInfo]: {컬럼명: ColumnInfo}
        """
        table_description = {}

        df = self.csv.load(table_name)

        for _, row in df.iterrows():
            column_name = row["original_column_name"]

            expanded_column_name = (
                row.get("column_name", "").strip()
                if pd.notna(row.get("column_name", ""))
                else ""
            )

            column_description = (
                row.get("column_description", "")
                .replace("\n", " ")
                .replace("commonsense evidence:", "")
                .strip()
                if pd.notna(row.get("column_description", ""))
                else ""
            )

            data_format = (
                row.get("data_format", "").strip()
                if pd.notna(row.get("data_format", ""))
                else ""
            )

            value_description = ""
            if use_value_description and pd.notna(row.get("value_description", "")):
                value_description = (
                    row["value_description"]
                    .replace("\n", " ")
                    .replace("commonsense evidence:", "")
                    .strip()
                )
                if value_description.lower().startswith("not useful"):
                    value_description = value_description[10:].strip()

            table_description[column_name.lower().strip()] = ColumnInfo(
                original_column_name=column_name,
                column_name=expanded_column_name,
                column_description=column_description,
                data_format=data_format,
                value_description=value_description,
            )

        return table_description
