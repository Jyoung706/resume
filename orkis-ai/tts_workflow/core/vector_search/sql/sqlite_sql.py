"""
SQLite SQL Templates

사용법:
    from tts_workflow.core.vector_search.sql.sqlite_sql import SQL

    sql = SQL.TABLE_INFO.format(table_name="users")
    sql = SQL.DISTINCT_VALUES.format(table_name="users", column_name="age")
"""


class SQL:
    """SQLite SQL 템플릿 모음"""

    # === PRAGMA ===
    TABLE_INFO = "PRAGMA table_info(`{table_name}`);"
    FOREIGN_KEY_LIST = "PRAGMA foreign_key_list(`{table_name}`);"

    # === SELECT ===
    ALL_TABLES = "SELECT name FROM sqlite_master WHERE type='table';"
    DDL_BY_TABLE = "SELECT sql FROM sqlite_master WHERE type='table' AND name='{table_name}';"
    DDL_BY_ALL_TABLE = "SELECT sql FROM sqlite_master WHERE type='table';"

    COUNT_ROWS = "SELECT COUNT(*) FROM `{table_name}`;"
    DISTINCT_VALUES = "SELECT DISTINCT `{column_name}` FROM `{table_name}` WHERE `{column_name}` IS NOT NULL"
    DISTINCT_VALUES_LIMIT = "SELECT DISTINCT `{column_name}` FROM `{table_name}` WHERE `{column_name}` IS NOT NULL LIMIT {limit}"
    DISTINCT_COUNT_LIMIT = "SELECT COUNT(*) FROM (SELECT DISTINCT `{column_name}` FROM `{table_name}` LIMIT {limit}) AS subquery;"

    UNIQUE_INFO = """SELECT SUM(LENGTH(unique_values)), COUNT(unique_values)
        FROM (
            SELECT DISTINCT `{column_name}` AS unique_values
            FROM `{table_name}`
            WHERE `{column_name}` IS NOT NULL
        ) AS subquery"""

    STATISTICS_INFO = """SELECT 'Total count ' || COUNT(`{column_name}`) || ' - Distinct count ' || COUNT(DISTINCT `{column_name}`) ||
        ' - Null count ' || SUM(CASE WHEN `{column_name}` IS NULL THEN 1 ELSE 0 END) AS counts
        FROM (SELECT `{column_name}` FROM `{table_name}` LIMIT 100000) AS limited_dataset;"""
