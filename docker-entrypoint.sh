#!/bin/sh
set -e

if [ -z "${EXIGN_DNS_RESOLVER:-""}" ]; then
    export EXIGN_DNS_RESOLVER=$(cat /etc/resolv.conf | grep nameserver | head -n 1 | awk '{print $2}')
fi

exec $@
