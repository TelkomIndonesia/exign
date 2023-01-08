#!/bin/bash
set -euo pipefail


EXIGN_HOSTNAME="${EXIGN_HOSTNAME:-"exign"}"
HOSTS_FILE="${HOSTS_FILE:-"./config/hosts"}"

function iplookup(){
    nslookup $1 \
        | grep 'Address: ' \
            | cut -d ' ' -f 2
}

if [ ! -f "/init" ]; then 
    touch "/init"
    cp "/etc/hosts" "/etc/hosts.orig"
fi

if [ -s "$HOSTS_FILE" ]; then 
    cat "/etc/hosts.orig" > "/etc/hosts"
    cat $HOSTS_FILE \
        | awk '{print $2}' \
            | xargs -I {} echo "$(iplookup "${EXIGN_HOSTNAME}") {}" \
                | tee -a "/etc/hosts"
fi

exec "$@"