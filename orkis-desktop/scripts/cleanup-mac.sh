#!/bin/bash
# Orkis Desktop 완전 삭제 스크립트 (macOS)

echo "[Orkis] Cleaning up all installed files..."

# 앱 번들 삭제
sudo rm -rf /Applications/orkis.app
rm -rf ~/Applications/orkis.app

# 앱 데이터 삭제
rm -rf ~/Library/Application\ Support/orkis-electron
rm -rf ~/.orkis

# Podman machine/컨테이너 데이터 삭제
rm -rf ~/.local/share/containers
rm -rf ~/.config/containers

# PKG receipt 삭제
sudo pkgutil --forget kr.orkis.app 2>/dev/null

echo "[Orkis] Cleanup complete"
