"""
RAG 전처리 순수 비즈니스 로직 — ExecutorConfig/ContextVar 없이 직접 사용.

기존 클라우드 코드(FaissPreprocessService, FaissSchemaRepository, FaissLSHDataRepository 등)를
sqlite3, faiss, duckdb, datasketch, langchain_openai 직접 호출로 포팅.
"""

import json
import os
import sqlite3
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import duckdb
import faiss
import numpy as np
import pandas as pd
from datasketch import MinHash
from langchain_openai import OpenAIEmbeddings


# ──────────────────────────────────────────────────────
# ColumnInfo (간단 dataclass)
# ──────────────────────────────────────────────────────

@dataclass
class ColumnInfo:
    original_column_name: str = ""
    column_name: str = ""
    column_description: str = ""
    data_format: str = ""
    value_description: str = ""


# ──────────────────────────────────────────────────────
# 상수
# ──────────────────────────────────────────────────────

DB_NAME = "aml"  # base_executor.py:69 하드코딩
ENCODING_FALLBACKS = ["utf-8-sig", "cp1252", "utf-8"]
MINHASH_NUM_PERM = 128
MINHASH_NGRAM_SIZE = 3
LSH_NBITS = 256
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


# ──────────────────────────────────────────────────────
# DB 검증
# ──────────────────────────────────────────────────────

def validate_source_db(db_path: str) -> bool:
    """소스 SQLite DB 유효성 검증 (SELECT 1)."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        conn.close()
        return result is not None and result[0] == 1
    except Exception:
        return False


# ──────────────────────────────────────────────────────
# 스키마 정보 추출
# ──────────────────────────────────────────────────────

def extract_schema_info(db_path: str) -> Dict[str, Any]:
    """
    소스 DB에서 전체 스키마 정보 추출.
    기존: FaissPreprocessService._extract_schema_info()
    반환: {table_name: {"__metadata__": {...}, col_name: {...}}}
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        # 테이블 목록
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cur.fetchall() if row[0] != "sqlite_sequence"]

        schema_info: Dict[str, Any] = {}
        for table in tables:
            schema_info[table] = {}

            # primary keys
            cur.execute(f"PRAGMA table_info(`{table}`)")
            columns_raw = cur.fetchall()
            primary_keys = [col[1] for col in columns_raw if col[5] > 0]

            # foreign keys
            cur.execute(f"PRAGMA foreign_key_list(`{table}`)")
            foreign_keys = cur.fetchall()

            # row count
            cur.execute(f"SELECT COUNT(*) FROM `{table}`")
            value_cnt = cur.fetchone()[0]

            # DDL
            cur.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
            ddl_row = cur.fetchone()
            ddl = ddl_row[0] if ddl_row else None

            schema_info[table]["__metadata__"] = {
                "primary_keys": primary_keys,
                "foreign_keys": [tuple(fk) for fk in foreign_keys],
                "value_cnt": value_cnt,
                "ddl": ddl,
            }

            # 컬럼 상세
            for col in columns_raw:
                cid, name, col_type, notnull, dflt_value, pk = col

                # unique values
                cur.execute(
                    f"SELECT DISTINCT `{name}` FROM `{table}` WHERE `{name}` IS NOT NULL"
                )
                unique_values = [str(r[0]) for r in cur.fetchall()]

                # unique count
                cur.execute(
                    f"SELECT COUNT(*) FROM (SELECT DISTINCT `{name}` FROM `{table}` LIMIT 21) AS subquery"
                )
                unique_cnt = cur.fetchone()[0]

                # statistics info
                try:
                    cur.execute(
                        f"""SELECT 'Total count ' || COUNT(`{name}`) || ' - Distinct count ' || COUNT(DISTINCT `{name}`) ||
                        ' - Null count ' || SUM(CASE WHEN `{name}` IS NULL THEN 1 ELSE 0 END) AS counts
                        FROM (SELECT `{name}` FROM `{table}` LIMIT 100000) AS limited_dataset"""
                    )
                    statics_row = cur.fetchone()
                    statics_info = statics_row[0] if statics_row else None
                except Exception:
                    statics_info = None

                # column example (DISTINCT, limit 50)
                cur.execute(
                    f"SELECT DISTINCT `{name}` FROM `{table}` WHERE `{name}` IS NOT NULL LIMIT 50"
                )
                column_example = [r[0] for r in cur.fetchall()]

                schema_info[table][name] = {
                    "id": cid,
                    "type": col_type,
                    "notnull": bool(notnull),
                    "dflt_value": dflt_value,
                    "pk": pk,
                    "unique_values": unique_values,
                    "unique_cnt": unique_cnt,
                    "statics_info": statics_info,
                    "column_example": column_example,
                }

        return schema_info
    finally:
        conn.close()


# ──────────────────────────────────────────────────────
# 스키마 JSON 저장
# ──────────────────────────────────────────────────────

def save_schema_json(schema_info: dict, output_dir: str) -> None:
    """
    schema_info를 {output_dir}/schema.json으로 저장.
    기존: JsonWriter._create()
    """
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, "schema.json")
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(schema_info, ensure_ascii=False, indent=2))


# ──────────────────────────────────────────────────────
# 테이블 설명 CSV 로드
# ──────────────────────────────────────────────────────

def load_table_descriptions(desc_dir: str, tables: List[str]) -> Dict[str, Dict[str, ColumnInfo]]:
    """
    CSV 파일에서 테이블/컬럼 설명 로드.
    기존: CsvSourceInfoRepository.load_table_description()

    desc_dir: {db_root}/{db_id}/database_description/
    tables: 테이블 이름 목록
    반환: {table_name: {col_name_lower: ColumnInfo}}
    """
    result: Dict[str, Dict[str, ColumnInfo]] = {}

    for table_name in tables:
        csv_path = os.path.join(desc_dir, f"{table_name}.csv")

        if not os.path.exists(csv_path):
            # CSV 없으면 빈 ColumnInfo fallback (extract_schema_info에서 컬럼 이름 재추출 필요 없이 caller에서 처리)
            result[table_name] = {}
            continue

        df = _read_csv_with_fallback(csv_path)
        if df is None:
            result[table_name] = {}
            continue

        table_desc: Dict[str, ColumnInfo] = {}
        for _, row in df.iterrows():
            original_column_name = str(row.get("original_column_name", ""))

            column_name = (
                str(row.get("column_name", "")).strip()
                if pd.notna(row.get("column_name", ""))
                else ""
            )

            column_description = ""
            if pd.notna(row.get("column_description", "")):
                column_description = (
                    str(row["column_description"])
                    .replace("\n", " ")
                    .replace("commonsense evidence:", "")
                    .strip()
                )

            data_format = (
                str(row.get("data_format", "")).strip()
                if pd.notna(row.get("data_format", ""))
                else ""
            )

            value_description = ""
            if pd.notna(row.get("value_description", "")):
                value_description = (
                    str(row["value_description"])
                    .replace("\n", " ")
                    .replace("commonsense evidence:", "")
                    .strip()
                )
                if value_description.lower().startswith("not useful"):
                    value_description = value_description[10:].strip()

            table_desc[original_column_name.lower().strip()] = ColumnInfo(
                original_column_name=original_column_name,
                column_name=column_name,
                column_description=column_description,
                data_format=data_format,
                value_description=value_description,
            )

        result[table_name] = table_desc

    return result


def _read_csv_with_fallback(csv_path: str) -> Optional[pd.DataFrame]:
    """인코딩 순차 시도: utf-8-sig → cp1252 → utf-8."""
    for encoding in ENCODING_FALLBACKS:
        try:
            df = pd.read_csv(csv_path, index_col=False, encoding=encoding)
            if not df.empty:
                return df
        except (UnicodeDecodeError, pd.errors.EmptyDataError):
            continue
    return None


# ──────────────────────────────────────────────────────
# Schema doc 생성
# ──────────────────────────────────────────────────────

def build_schema_docs(tables_description: Dict[str, Dict[str, ColumnInfo]]) -> List[dict]:
    """
    테이블 설명에서 스키마 인덱싱용 doc 리스트 생성.
    기존: FaissSchemaRepository.create() 내부 로직 (faiss_schema_repository.py:32-50)

    각 컬럼에서 column_name, column_description, value_description 3가지 텍스트 variant 생성.
    빈 문자열은 skip.
    """
    docs = []
    for table_name, col_desc in tables_description.items():
        for column_name, column_info in col_desc.items():
            base_metadata = {
                "table_name": table_name,
                "original_column_name": column_name,
                "column_name": column_info.column_name,
                "column_description": column_info.column_description,
                "value_description": column_info.value_description,
            }
            for data in [
                column_info.column_name,
                column_info.column_description,
                column_info.value_description,
            ]:
                if not data.strip():
                    continue
                doc = base_metadata.copy()
                doc["index_text"] = data
                docs.append(doc)
    return docs


# ──────────────────────────────────────────────────────
# Schema FAISS + DuckDB 인덱스 생성
# ──────────────────────────────────────────────────────

def build_schema_index(docs: List[dict], api_key: str, output_dir: str) -> None:
    """
    OpenAI 임베딩 → FAISS IndexFlatIP → DuckDB column_semantic_docs.
    기존: FaissSchemaRepository.create()
    """
    if not docs:
        return

    # 1. OpenAI Embedding
    embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL, api_key=api_key)
    texts = [d["index_text"] for d in docs]
    texts_embedded = embeddings.embed_documents(texts)

    # 2. FAISS Index
    query_matrix = np.array(texts_embedded, dtype=np.float32)
    faiss.normalize_L2(query_matrix)

    base_index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index = faiss.IndexIDMap(base_index)
    faiss_ids = np.arange(len(query_matrix), dtype=np.int64)
    index.add_with_ids(query_matrix, faiss_ids)

    index_dir = os.path.join(output_dir, "schema_vector_db")
    os.makedirs(index_dir, exist_ok=True)
    faiss.write_index(index, os.path.join(index_dir, f"{DB_NAME}.index"))

    # 3. DuckDB
    db_path = os.path.join(index_dir, f"{DB_NAME}.duckdb")
    # 기존 파일 있으면 삭제 후 재생성
    if os.path.exists(db_path):
        os.remove(db_path)
    conn = duckdb.connect(db_path)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS column_semantic_docs (
                faiss_id BIGINT PRIMARY KEY,
                index_text TEXT NOT NULL,
                table_name TEXT NOT NULL,
                original_column_name TEXT NOT NULL,
                column_name TEXT,
                column_description TEXT,
                value_description TEXT
            )
        """)
        values = [
            (int(fid), item["index_text"], item["table_name"],
             item["original_column_name"], item["column_name"],
             item["column_description"], item["value_description"])
            for fid, item in zip(faiss_ids, docs)
        ]
        conn.executemany(
            "INSERT INTO column_semantic_docs VALUES (?, ?, ?, ?, ?, ?, ?)",
            values,
        )
    finally:
        conn.close()


# ──────────────────────────────────────────────────────
# Unique values 추출 (Data 전처리용)
# ──────────────────────────────────────────────────────

def extract_unique_values(db_path: str) -> Dict[str, Dict[str, List[str]]]:
    """
    TEXT 컬럼의 유니크 값 추출 (키워드/사이즈 필터 적용).
    기존: FaissPreprocessService._extract_unique_values()
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        # 테이블 목록
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cur.fetchall() if row[0] != "sqlite_sequence"]

        # 전체 PK 수집
        primary_keys: List[str] = []
        for table in tables:
            cur.execute(f"PRAGMA table_info(`{table}`)")
            for col in cur.fetchall():
                if col[5] > 0:  # pk > 0
                    primary_keys.append(col[1])

        unique_values: Dict[str, Dict[str, List[str]]] = {}

        for table in tables:
            cur.execute(f"PRAGMA table_info(`{table}`)")
            columns_raw = cur.fetchall()

            # TEXT 타입 + PK 제외
            text_columns = [
                col[1]
                for col in columns_raw
                if col[2] and "text" in col[2].lower()
                and col[1].lower() not in [pk.lower() for pk in primary_keys]
            ]

            table_values: Dict[str, List[str]] = {}
            for column in text_columns:
                # 키워드 필터
                if any(
                    kw in column.lower()
                    for kw in ["_id", " id", "url", "email", "web", "time", "phone", "date", "address"]
                ) or column.endswith("Id"):
                    continue

                # 사이즈 임계값
                try:
                    cur.execute(
                        f"""SELECT SUM(LENGTH(unique_values)), COUNT(unique_values)
                        FROM (
                            SELECT DISTINCT `{column}` AS unique_values
                            FROM `{table}`
                            WHERE `{column}` IS NOT NULL
                        ) AS subquery"""
                    )
                    result = cur.fetchone()
                    sum_of_lengths = result[0] or 0
                    count_distinct = result[1] or 0
                except Exception:
                    continue

                if count_distinct == 0:
                    continue

                average_length = sum_of_lengths / count_distinct

                if (
                    ("name" in column.lower() and sum_of_lengths < 5_000_000)
                    or (sum_of_lengths < 2_000_000 and average_length < 25)
                    or count_distinct < 100
                ):
                    cur.execute(
                        f"SELECT DISTINCT `{column}` FROM `{table}` WHERE `{column}` IS NOT NULL"
                    )
                    values = [str(r[0]) for r in cur.fetchall()]
                    table_values[column] = values

            unique_values[table] = table_values

        return unique_values
    finally:
        conn.close()


# ──────────────────────────────────────────────────────
# Data doc 생성
# ──────────────────────────────────────────────────────

def build_data_docs(unique_values: Dict[str, Dict[str, List[str]]]) -> List[dict]:
    """
    유니크 값에서 데이터 인덱싱용 doc 리스트 생성.
    기존: FaissDataRepository.create() 내부 로직 (faiss_data_repository.py:33-43)
    """
    docs = []
    for table_name, columns in unique_values.items():
        for column_name, values in columns.items():
            for value in values:
                if not value or not value.strip():
                    continue
                docs.append({
                    "table_name": table_name,
                    "column_name": column_name,
                    "index_text": value.strip(),
                })
    return docs


# ──────────────────────────────────────────────────────
# MinHash 임베딩
# ──────────────────────────────────────────────────────

def _minhash_embedding(texts: List[str]) -> List[List[float]]:
    """
    MinHash 3-gram 임베딩 + L2 정규화.
    기존: MinhashVectorizer.embedding() (minhash_vectorizer.py:23-42)
    """
    vectors = []
    for text in texts:
        m = MinHash(num_perm=MINHASH_NUM_PERM)
        text_lower = text.lower().strip()
        if len(text_lower) < MINHASH_NGRAM_SIZE:
            if text_lower:
                m.update(text_lower.encode("utf-8"))
        else:
            for i in range(len(text_lower) - MINHASH_NGRAM_SIZE + 1):
                n_gram = text_lower[i : i + MINHASH_NGRAM_SIZE]
                m.update(n_gram.encode("utf-8"))
        vec = np.array(m.hashvalues, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        vectors.append(vec.tolist())
    return vectors


# ──────────────────────────────────────────────────────
# Data LSH FAISS + DuckDB 인덱스 생성
# ──────────────────────────────────────────────────────

def build_data_lsh_index(docs: List[dict], output_dir: str) -> None:
    """
    MinHash 임베딩 → FAISS IndexLSH → DuckDB entity_docs.
    기존: FaissLSHDataRepository + MinhashVectorizer
    """
    if not docs:
        return

    # 1. MinHash Embedding
    texts = [d["index_text"] for d in docs]
    texts_embedded = _minhash_embedding(texts)

    # 2. FAISS LSH
    query_matrix = np.array(texts_embedded, dtype=np.float32)
    faiss.normalize_L2(query_matrix)

    base_index = faiss.IndexLSH(MINHASH_NUM_PERM, LSH_NBITS)
    index = faiss.IndexIDMap(base_index)
    faiss_ids = np.arange(len(query_matrix), dtype=np.int64)
    index.add_with_ids(query_matrix, faiss_ids)

    index_dir = os.path.join(output_dir, "data_vector_db_lsh")
    os.makedirs(index_dir, exist_ok=True)
    faiss.write_index(index, os.path.join(index_dir, f"{DB_NAME}.index"))

    # 3. DuckDB
    db_path = os.path.join(index_dir, f"{DB_NAME}.duckdb")
    if os.path.exists(db_path):
        os.remove(db_path)
    conn = duckdb.connect(db_path)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS entity_docs (
                faiss_id BIGINT PRIMARY KEY,
                table_name TEXT NOT NULL,
                column_name TEXT NOT NULL,
                index_text TEXT NOT NULL
            )
        """)
        values = [
            (int(fid), doc["table_name"], doc["column_name"], doc["index_text"])
            for fid, doc in zip(faiss_ids, docs)
        ]
        conn.executemany(
            "INSERT INTO entity_docs (faiss_id, table_name, column_name, index_text) VALUES (?, ?, ?, ?)",
            values,
        )
    finally:
        conn.close()


# ──────────────────────────────────────────────────────
# 인덱스 상태 확인
# ──────────────────────────────────────────────────────

def check_index_status(output_dir: str, rag_type: int) -> bool:
    """
    전처리 인덱스 파일 존재 여부 확인.
    rag_type 1 (SCHEMA): schema_vector_db/aml.index + aml.duckdb
    rag_type 2 (DATA): data_vector_db_lsh/aml.index + aml.duckdb
    """
    if rag_type == 1:
        subdir = "schema_vector_db"
    elif rag_type == 2:
        subdir = "data_vector_db_lsh"
    else:
        return False

    index_path = os.path.join(output_dir, subdir, f"{DB_NAME}.index")
    duckdb_path = os.path.join(output_dir, subdir, f"{DB_NAME}.duckdb")
    return os.path.exists(index_path) and os.path.exists(duckdb_path)
