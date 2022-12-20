#!/bin/bash
set -euo pipefail

REMOTE_CONFIG_URL="${REMOTE_CONFIG_URL:-""}"
REMOTE_CONFIG_USE_FRPROXY="${REMOTE_CONFIG_USE_FRPROXY:-""}"
OUTPUT_DIR="config"

if [ -z "$REMOTE_CONFIG_URL" ]; then
    echo "[INFO] no remote config specified"
    exit 0
fi

if [ "${REMOTE_CONFIG_USE_FRPROXY}" == "true" ]; then
    npm run server &
    SERVER_PID=$!
    trap "kill $SERVER_PID" EXIT
    until curl -sf ifconfig.me --resolve 'ifconfig.me:80:127.0.0.1' >/dev/null; do
        sleep 1
        echo "[INFO] waiting"
    done
    echo "[INFO] frproxy started"
fi

declare -a files=(".env" "hosts" "backend-transport/ca.crt")
for file in "${files[@]}"; do
    url="$REMOTE_CONFIG_URL/$file"
    filename="$OUTPUT_DIR/$file"
    dir="$(dirname "$filename")"

    mkdir -p "$dir"
    rm -rf "$filename"
    curl \
        -sLO \
        --output-dir "$dir" \
        "$url" \
        --write-out "%{http_code}" \
        $(if [ "${REMOTE_CONFIG_USE_FRPROXY}" == "true" ]; then
            echo --insecure --resolve "$(curl -vs "$url" 2>&1 | grep 'Connected to ' | awk '{print $4":"$7}'):127.0.0.1"
        fi) |
        grep -E -w '200|404' >/dev/null
done
echo "[INFO] Remote config downloaded from '$REMOTE_CONFIG_URL'"
