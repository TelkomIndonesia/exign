#!/bin/bash
set -euo pipefail

REMOTE_CONFIG_URL="${REMOTE_CONFIG_URL:-""}"
REMOTE_CONFIG_USE_FRPROXY="${REMOTE_CONFIG_USE_FRPROXY:-""}"
CONFIG_DIR="${CONFIG_DIR:-"config"}"

if [ -z "$REMOTE_CONFIG_URL" ]; then
    echo "[INFO] no remote config specified"
    exit 0
fi

function get-ip-port {
    curl -vs "$1" 2>&1 | grep 'Connected to ' | awk '{print $4":"$7}'
}

if [ "${REMOTE_CONFIG_USE_FRPROXY}" == "true" ]; then
    npm run server &
    SERVER_PID=$!
    trap "kill $SERVER_PID" EXIT

    until curl \
        -sf "$REMOTE_CONFIG_URL" \
        --insecure --resolve "$(get-ip-port "$REMOTE_CONFIG_URL"):127.0.0.1" \
        >/dev/null; do
        sleep 5
        echo "[WARN] Make sure your public key has been whitelisted at the remote server. Retrying..."
    done

    echo "[INFO] Connection success! frproxy is ready for downloading remote-config."
fi

declare -a files=(".env" "hosts" "backend-transport/ca.crt")
for file in "${files[@]}"; do
    url="$REMOTE_CONFIG_URL/$file"
    filename="$CONFIG_DIR/$file"
    dir="$(dirname "$filename")"

    mkdir -p "$dir"
    rm -rf "$filename"
    curl \
        -sLO \
        --output-dir "$dir" \
        "$url" \
        --write-out "%{http_code}" \
        $(if [ "${REMOTE_CONFIG_USE_FRPROXY}" == "true" ]; then
            echo --insecure --resolve "$(get-ip-port "$url"):127.0.0.1"
        fi) |
        grep -E -w '200|404' >/dev/null
done
echo "[INFO] Remote config downloaded from '$REMOTE_CONFIG_URL'"
