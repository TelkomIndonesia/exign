export default {
    clientMaxBufferSize: parseInt(process.env.MPROXY_FRONT_CLIENT_MAX_BUFFER_SIZE || "") || 8192,
    doubleDashParentDomains: process.env.MPROXY_FRONT_DOUBLEDASH_PARENT_DOMAINS?.split(",") || [],
    signature: {
        keyfile: process.env.MPROXY_FRONT_SIGNATURE_KEYFILE || "./keys/signature/key.pem",
        pubkeyfile: process.env.MPROXY_FRONT_SIGNATURE_KEYFILE || "./keys/signature/pubkey.pem"
    },
    transport: {
        caKeyfile: process.env.MPROXY_FRONT_SIGNATURE_KEYFILE || "./keys/transport/ca-key.pem",
        caCertfile: process.env.MPROXY_FRONT_SIGNATURE_KEYFILE || "./keys/transport/ca.crt"
    }
}