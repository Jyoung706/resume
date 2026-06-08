#!/bin/sh

echo "[run.sh] passed in env file path: $ENV"

python3 main.py --env $ENV --debug $DEBUG