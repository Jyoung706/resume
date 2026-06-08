#!/bin/bash

# ORKIS Backend - console.log를 logger로 일괄 변환 스크립트
# 사용법: ./convert-logging.sh <파일경로>

FILE=$1

if [ -z "$FILE" ]; then
  echo "Usage: $0 <file_path>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "Error: File '$FILE' not found"
  exit 1
fi

echo "Converting logging in: $FILE"

# logger import 확인 및 추가
if ! grep -q "import.*logger.*from.*@orkis/core/utils" "$FILE"; then
  echo "Adding logger import..."
  # import 문 찾아서 그 다음 줄에 추가
  sed -i "/^import/a import { logger } from '@orkis/core/utils';" "$FILE"
fi

# console.log → logger.info 변환
sed -i 's/console\.log(/logger.info(/g' "$FILE"

# console.error → logger.error 변환
sed -i 's/console\.error(/logger.error(/g' "$FILE"

# console.warn → logger.warn 변환
sed -i 's/console\.warn(/logger.warn(/g' "$FILE"

# console.debug → logger.debug 변환
sed -i 's/console\.debug(/logger.debug(/g' "$FILE"

echo "Conversion completed!"
echo ""
echo "변환된 내용:"
grep -n "logger\." "$FILE" | head -10
