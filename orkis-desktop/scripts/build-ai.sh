#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
AI_DIR="$DESKTOP_DIR/../orkis-desktop-ai"
OUTPUT_DIR="$DESKTOP_DIR/resources/ai"

echo "[build-ai] Building orkis-ai with PyInstaller..."
cd "$AI_DIR"

if [ ! -d ".venv-desktop" ]; then
  python3.12 -m venv .venv-desktop
fi
source .venv-desktop/bin/activate
pip install -r requirements.txt
pip install pyinstaller
pyinstaller orkis-ai.spec --noconfirm --clean

rm -rf "$OUTPUT_DIR"
cp -r "$AI_DIR/dist/orkis-ai" "$OUTPUT_DIR"
chmod +x "$OUTPUT_DIR/orkis-ai" 2>/dev/null || true
deactivate
echo "[build-ai] Done -> $OUTPUT_DIR"
