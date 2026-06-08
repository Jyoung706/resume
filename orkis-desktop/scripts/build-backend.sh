#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$DESKTOP_DIR/../orkis-backend"
OUTPUT_DIR="$DESKTOP_DIR/resources/backend"

echo "[build-backend] Building orkis-backend..."

cd "$BACKEND_DIR"
yarn build

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# tsc 빌드 결과 복사 (node_modules 없음 — NODE_PATH로 해결)
cp -r "$BACKEND_DIR/lib/"* "$OUTPUT_DIR/"

# 정적 리소스 복사
mkdir -p "$OUTPUT_DIR/resources"
cp -r "$BACKEND_DIR/resources/systemdbfile" "$OUTPUT_DIR/resources/systemdbfile"
cp -r "$BACKEND_DIR/resources/dev.env" "$OUTPUT_DIR/resources/dev.env"

# JSON 초기 데이터 복사
cp -r "$BACKEND_DIR/src/db_file" "$OUTPUT_DIR/src/db_file"

# 샘플 DB 복사 (SQLite + CSV + FAISS 인덱스)
cp -r "$BACKEND_DIR/src/sample_db" "$OUTPUT_DIR/src/sample_db"

echo "[build-backend] Done -> $OUTPUT_DIR (no node_modules, using NODE_PATH)"
