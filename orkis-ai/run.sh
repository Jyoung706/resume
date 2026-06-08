#!/bin/sh

# 기본값 설정
APP_HOST=${APP_HOST:-127.0.0.1}
APP_PORT=${APP_PORT:-8000}
WORKERS=${WORKERS:-1}
MAX_REQUESTS=${MAX_REQUESTS}
MAX_REQUESTS_JITTER=${MAX_REQUESTS_JITTER}

export APP_HOST
export APP_PORT

echo "[INFO] Starting with APP_HOST=$APP_HOST, APP_PORT=$APP_PORT, WORKERS=$WORKERS"
echo "[INFO] MAX_REQUESTS=$MAX_REQUESTS, MAX_REQUESTS_JITTER=$MAX_REQUESTS_JITTER"

CMD="gunicorn \
    -k uvicorn.workers.UvicornWorker \
    -w ${WORKERS} \
    -b ${APP_HOST}:${APP_PORT} \
    --timeout 1800"

if [ -n "$MAX_REQUESTS" ] && [ "$MAX_REQUESTS" -ne 0 ] && \
    [ -n "$MAX_REQUESTS_JITTER" ] && [ "$MAX_REQUESTS_JITTER" -ne 0 ]; then

    CMD="$CMD --max-requests ${MAX_REQUESTS} --max-requests-jitter ${MAX_REQUESTS_JITTER}"
    echo "[INFO] Using max-requests options"
else
    echo "[INFO] Running without max-requests options"
fi

CMD="$CMD asgi:app"

echo "[INFO] Executing: $CMD"
exec $CMD
