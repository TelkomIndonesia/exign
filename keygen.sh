#!/bin/bash
set -euo pipefail

KEYS_PARENT_DIR="keys"
KEYS_TRANSPORT_DIR="${KEYS_PARENT_DIR}/transport"
KEYS_SIGNATURE_DIR="${KEYS_PARENT_DIR}/signature"

KEY_TRANSPORT_CA_PRIVATE="${KEYS_TRANSPORT_DIR}/ca-key.pem"
KEY_TRANSPORT_CA_CERTIFICATE="${KEYS_TRANSPORT_DIR}/ca.crt"
KEY_SIGNATURE_PRIVATE="${KEYS_SIGNATURE_DIR}/key.pem"
KEY_SIGNATURE_PUBLIC="${KEYS_SIGNATURE_DIR}/pubkey.pem"

mkdir -p "${KEYS_TRANSPORT_DIR}" "${KEYS_SIGNATURE_DIR}"

if [ ! -f "${KEY_TRANSPORT_CA_PRIVATE}" ] || [ ! -f "${KEY_TRANSPORT_CA_CERTIFICATE}" ]; then 
    openssl genrsa 2048 > "${KEY_TRANSPORT_CA_PRIVATE}"
    openssl req -new -x509 -nodes -days 365000 \
        -key "${KEY_TRANSPORT_CA_PRIVATE}" \
        -out "${KEY_TRANSPORT_CA_CERTIFICATE}" \
        -subj "/CN=Local CA/OU=Group/O=Corp/L=Jakarta/ST=Jakarta/C=ID"
else
    echo "Transport keys exist."
fi

if [ ! -f "${KEY_SIGNATURE_PRIVATE}" ] || [ ! -f "${KEY_SIGNATURE_PUBLIC}" ]; then 
    openssl ecparam -genkey -name prime256v1 -noout -out "${KEY_SIGNATURE_PRIVATE}"
    openssl ec -in "${KEY_SIGNATURE_PRIVATE}" -pubout -out "${KEY_SIGNATURE_PUBLIC}"
else
    echo "Signature keys exist."
fi