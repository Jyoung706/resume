#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "=== Building Orkis Desktop (Full) ==="
"$SCRIPT_DIR/build-backend.sh"
"$SCRIPT_DIR/build-ai.sh"
echo "=== All builds complete ==="
