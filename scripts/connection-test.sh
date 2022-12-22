#!/bin/bash
set -euo pipefail

SOCKS5_PROXY_ENDPOINT="${SOCKS5_PROXY_ENDPOINT:-""}"
TARGET_HOST="${1:-"https://icanhazip.com"}"
if [ -f "./config/hosts" ]; then
    host="$(cat ./config/hosts | awk '{print $2}' | tail -n 1)"
    TARGET_HOST="${host:-"$TARGET_HOST"}"
fi

until curl -ksfL "$TARGET_HOST" >/dev/null; do
    echo "[WARN] Connection test fail using dnsmasq resolver. Retrying..."
    sleep 1
done

if [ ! -z "$SOCKS5_PROXY_ENDPOINT" ]; then
    i=0
    until curl -ksfL -x socks5://$SOCKS5_PROXY_ENDPOINT "$TARGET_HOST" >/dev/null; do
        if ((i++ == 5)); then
            echo "[WARN] Give up trying. You might not be able to use the SOCKS5 proxy."
            break
        fi

        echo "[WARN] Connection test fail using SOCKS5 proxy. Retrying..."
        sleep 1
    done
fi

sleep 3
echo "==============================="
echo "[INFO] Connection test success."
echo "==============================="
