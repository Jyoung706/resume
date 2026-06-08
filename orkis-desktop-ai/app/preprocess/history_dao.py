"""
Preprocess History DAO - backend SQLite 의 rag_preprocessing_history 직접 UPDATE.

backend container 와 동일 SQLite 파일 (`$DATA_PATH/db/orkis.sqlite`) 을 mount 공유.
row 식별은 자연 키 (user_id + db_id + rag_type) 사용 — backend `deletePreviousHistory` 로
같은 (connection, rag_type, user) 조합 unique 보장.
"""
import os
import sqlite3
from pathlib import Path


def _db_path() -> str:
    data_path = os.environ.get("DATA_PATH", "/app/data")
    return str(Path(data_path) / "db" / "orkis.sqlite")


def update_status(
    user_id: str,
    db_id: str,
    rag_type: int,
    status: str,
    error_message: str | None = None,
) -> None:
    """rag_preprocessing_history.status 갱신.

    status: "processing" | "success" | "failed"
    """
    conn = sqlite3.connect(_db_path(), timeout=5.0)
    try:
        conn.execute(
            """
            UPDATE rag_preprocessing_history
            SET status = ?,
                error_message = ?,
                updated_at = datetime('now')
            WHERE db_id = ? AND rag_type = ? AND user_id = ?
            """,
            (status, error_message, db_id, rag_type, user_id),
        )
        conn.commit()
    finally:
        conn.close()
