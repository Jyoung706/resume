"""
Preprocess Service - RAG 전처리 비즈니스 로직 (프로토콜 독립).

진행 상태는 backend SQLite `rag_preprocessing_history.status` 를 직접 UPDATE.
프론트엔드는 backend `/db-connection/rag/history` polling 으로 변화 인지.
"""

import asyncio
import os
import sqlite3
from pathlib import Path
from typing import Dict, Tuple

from tts_workflow.core.conf.config import config

from app.preprocess.history_dao import update_status
from app.socket.local_preprocess import (
    ColumnInfo,
    build_data_docs,
    build_data_lsh_index,
    build_schema_docs,
    build_schema_index,
    extract_schema_info,
    extract_unique_values,
    load_table_descriptions,
    save_schema_json,
    validate_source_db,
)


# ──────────────────────────────────────────────────────
# 전처리 상태 상수
# ──────────────────────────────────────────────────────

class PreprocessStatus:
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"


# ──────────────────────────────────────────────────────
# 인메모리 상태 (Redis 대체)
# ──────────────────────────────────────────────────────

_running_preprocesses: Dict[Tuple[str, int], bool] = {}
_running_lock = asyncio.Lock()


# ──────────────────────────────────────────────────────
# 경로 해석
# ──────────────────────────────────────────────────────

# 소스 DB + 전처리 출력 모두 DB_NETWORK_PATH 사용 (Backend 위치 기준)
db_root = config.DB_NETWORK_PATH


def _resolve_sqlite_path(root: Path, db_id: str) -> str:
    """
    {root}/{db_id}/ 하위에서 .sqlite, .sqlite3, .db 순차 탐색.
    기존 SqliteReader._setup() / Backend stream.handler.ts 규칙.
    """
    db_dir = root / db_id
    db_name = Path(db_id).name

    for ext in (".sqlite", ".sqlite3", ".db"):
        candidate = db_dir / f"{db_name}{ext}"
        if candidate.exists():
            return str(candidate)

    # fallback: 디렉토리 내 첫 번째 매칭 파일
    if db_dir.exists():
        for ext in (".sqlite", ".sqlite3", ".db"):
            for f in db_dir.iterdir():
                if f.suffix == ext:
                    return str(f)

    raise FileNotFoundError(f"No SQLite database found for db_id={db_id} in {db_dir}")


# ──────────────────────────────────────────────────────
# 파이프라인 오케스트레이션 (sync, run_in_executor에서 호출)
# ──────────────────────────────────────────────────────

def schema_preprocess(db_path: str, api_key: str, output_dir: str) -> None:
    """Schema 전처리 전체 파이프라인."""
    # 1. 스키마 정보 추출
    schema_info = extract_schema_info(db_path)
    if not schema_info:
        raise Exception("No tables found in the source database")

    # 2. schema.json 저장
    save_schema_json(schema_info, output_dir)

    # 3. 테이블 설명 CSV 로드 (없으면 fallback)
    desc_dir = os.path.join(os.path.dirname(db_path), "database_description")
    tables = list(schema_info.keys())

    tables_description = load_table_descriptions(desc_dir, tables)

    # CSV 없는 테이블은 컬럼 이름으로 fallback
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        for table_name in tables:
            if not tables_description.get(table_name):
                cur.execute(f"PRAGMA table_info(`{table_name}`)")
                columns = cur.fetchall()
                tables_description[table_name] = {
                    col[1].lower(): ColumnInfo(
                        original_column_name=col[1],
                        column_name=col[1],
                    )
                    for col in columns
                }
    finally:
        conn.close()

    # 4. 스키마 doc 생성
    docs = build_schema_docs(tables_description)

    # 5. FAISS + DuckDB 인덱스 생성
    if docs:
        build_schema_index(docs, api_key, output_dir)


def data_preprocess(db_path: str, output_dir: str) -> None:
    """Data 전처리 전체 파이프라인."""
    # 1. 유니크 값 추출
    unique_values = extract_unique_values(db_path)

    # 2. data doc 생성
    docs = build_data_docs(unique_values)

    # 3. LSH + DuckDB 인덱스 생성
    if docs:
        build_data_lsh_index(docs, output_dir)


# ──────────────────────────────────────────────────────
# 공개 API
# ──────────────────────────────────────────────────────

async def _run_single_preprocess(
    c_type: int,
    user_id: str,
    db_id: str,
    api_key: str,
) -> None:
    """개별 ragType 전처리 - asyncio.gather로 병렬 호출되는 단위."""
    async with _running_lock:
        if _running_preprocesses.get((db_id, c_type)):
            print(f"[PreprocessService] Skipping duplicate for ({db_id}, {c_type}) - already running")
            return
        _running_preprocesses[(db_id, c_type)] = True

    try:
        db_path = _resolve_sqlite_path(db_root, db_id)
        output_dir = str(db_root / db_id)

        if not await asyncio.to_thread(validate_source_db, db_path):
            raise Exception(f"Database not found or invalid: {db_id}")

        await asyncio.to_thread(
            update_status, user_id, db_id, c_type, PreprocessStatus.PROCESSING
        )

        loop = asyncio.get_event_loop()
        if c_type == 1:
            await loop.run_in_executor(
                None, schema_preprocess, db_path, api_key, output_dir
            )
        else:
            await loop.run_in_executor(
                None, data_preprocess, db_path, output_dir
            )

        await asyncio.to_thread(
            update_status, user_id, db_id, c_type, PreprocessStatus.SUCCESS
        )

    except Exception as e:
        await asyncio.to_thread(
            update_status,
            user_id,
            db_id,
            c_type,
            PreprocessStatus.FAILED,
            str(e),
        )

    finally:
        async with _running_lock:
            _running_preprocesses.pop((db_id, c_type), None)


def verify_sample_assets(db_id: str) -> dict:
    """샘플 DB 전처리 산출물 존재 검증 (cloud `/preprocess/sample` 의 desktop 대응).

    cloud 는 NAS(DB_NETWORK_PATH)의 미리 전처리된 샘플 인덱스를 DB_ROOT_PATH 로
    복사(preprocess_copy)하지만, desktop 은 소스/산출물 경로가 DB_NETWORK_PATH
    단일이라 backend 가 sample_db 자산(sqlite + schema.json + schema_vector_db +
    data_vector_db_lsh)을 {db_id}/ 로 복사하는 순간 이미 제자리에 있다.
    → 복사 없이 산출물 존재만 검증하고 응답한다.

    응답 형식은 backend `callSamplePreprocessApi` 기대값:
    {success, result, error, timestamp}
    """
    from datetime import datetime

    db_dir = db_root / db_id
    missing = []

    if not db_dir.exists():
        missing.append(str(db_dir))
    else:
        # sqlite 파일
        try:
            _resolve_sqlite_path(db_root, db_id)
        except FileNotFoundError:
            missing.append("*.sqlite")

        # 전처리 산출물 (sample_db 자산에 포함되어 backend 복사로 전달됨)
        for asset in ("schema.json", "schema_vector_db", "data_vector_db_lsh"):
            if not (db_dir / asset).exists():
                missing.append(asset)

    success = len(missing) == 0
    if not success:
        print(f"[PreprocessService] sample assets missing for {db_id}: {missing}")

    return {
        "success": success,
        "result": {"db_id": db_id},
        "error": None if success else f"sample preprocess assets missing: {', '.join(missing)}",
        "timestamp": datetime.now().isoformat(),
    }


async def run_preprocess(data: dict):
    """
    RAG 전처리 실행.

    data: {user_id, db_id, type: 0|1|2, api_key}
    - type 0 = ALL (SCHEMA + DATA 병렬)
    - type 1 = SCHEMA
    - type 2 = DATA

    진행 상태는 backend SQLite rag_preprocessing_history.status 직접 UPDATE.
    """
    user_id = data.get("user_id", "")
    db_id = data.get("db_id", "")
    rag_type = data.get("type", 0)
    api_key = data.get("api_key", "")
    print(f"[PreprocessService] Received - user_id: {user_id}, db_id: {db_id}, type: {rag_type}")

    type_list = [1, 2] if rag_type == 0 else [rag_type]

    await asyncio.gather(
        *[
            _run_single_preprocess(c_type, user_id, db_id, api_key)
            for c_type in type_list
        ],
        return_exceptions=True,
    )
