#!/bin/bash
set -euo pipefail

REMOTE_CONFIG_URL="${REMOTE_CONFIG_URL:-""}"
OUTPUT_DIR="config"

if [ -z "$REMOTE_CONFIG_URL" ]; then
    echo "[INFO] no remote config specified"
    exit 0
fi

declare -a files=(".env" "backend-transport/ca.crt")
for file in "${files[@]}"; do
    url="$REMOTE_CONFIG_URL/$file"
    filename="$OUTPUT_DIR/$file"
    dir="$(dirname "$filename")"

    mkdir -p "$dir"
    rm -rf "$filename"
    curl -s -L -O --output-dir "$dir" "$url" --write-out "%{http_code}" |
        grep -E -w '200|404' >/dev/null
    [ -s "$filename" ] || rm -rf "$filename"
done
echo "[INFO] Remote config downloaded from '$REMOTE_CONFIG_URL'"