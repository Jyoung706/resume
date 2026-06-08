#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE_DIR="$(cd "$DESKTOP_DIR/../.." && pwd)"
IMAGES_DIR="$DESKTOP_DIR/resources/images"

echo "============================================"
echo " Orkis Desktop - Windows x64 Build"
echo "============================================"

# ──────────────────────────────────────────────
# 1. Docker 이미지 빌드 + tar 저장 (병렬)
# ──────────────────────────────────────────────
mkdir -p "$IMAGES_DIR"

echo ""
echo "[1/4] Building Docker images (parallel)..."

(
  echo "[Backend] Building..."
  cd "$WORKSPACE_DIR/apps/orkis-backend"
  docker build --platform linux/amd64 --no-cache -f Dockerfile.desktop -t orkis-backend:desktop .
  echo "[Backend] Saving tar..."
  docker save orkis-backend:desktop -o "$IMAGES_DIR/orkis-backend.tar"
  echo "[Backend] Done ($(du -sh "$IMAGES_DIR/orkis-backend.tar" | cut -f1))"
) &
PID_BACKEND=$!

(
  echo "[AI] Building..."
  cd "$WORKSPACE_DIR/apps/orkis-desktop-ai"
  docker build --platform linux/amd64 --no-cache -f Dockerfile.desktop -t orkis-ai:desktop .
  echo "[AI] Saving tar..."
  docker save orkis-ai:desktop -o "$IMAGES_DIR/orkis-ai.tar"
  echo "[AI] Done ($(du -sh "$IMAGES_DIR/orkis-ai.tar" | cut -f1))"
) &
PID_AI=$!

# 둘 다 완료 대기 (하나라도 실패하면 종료)
FAIL=0
wait $PID_BACKEND || FAIL=1
wait $PID_AI || FAIL=1
if [ $FAIL -ne 0 ]; then
  echo "Docker image build failed!"
  exit 1
fi
echo "[1/4] All Docker images ready"

# ──────────────────────────────────────────────
# 3. Electron 소스 빌드 (prod 모드)
# ──────────────────────────────────────────────
echo ""
echo "[2/4] Building Electron app + Packaging Windows x64 installer..."
cd "$DESKTOP_DIR"
yarn run pack:win

echo ""
echo "============================================"
echo " Build Complete!"
echo "============================================"
echo " Output: $DESKTOP_DIR/release/"
ls -lh "$DESKTOP_DIR/release/"*.exe 2>/dev/null || echo " (no .exe found - check release/ folder)"
echo "============================================"
