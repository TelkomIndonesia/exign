export const config = {
  clientBodyBufferSize: parseInt(process.env.FRPROXY_CLIENT_BODY_BUFFER_SIZE || '') || 8192,
  doubleDashParentDomains: process.env.FRPROXY_DOUBLEDASH_PARENT_DOMAINS?.split(',') || [],
  signature: {
    keyfile: process.env.FRPROXY_SIGNATURE_KEYFILE || './keys/signature/key.pem',
    pubkeyfile: process.env.FRPROXY_SIGNATURE_PUBKEYFILE || './keys/signature/pubkey.pem'
  },
  transport: {
    caKeyfile: process.env.FRPROXY_TRANSPORT_CA_KEYFILE || './keys/transport/ca-key.pem',
    caCertfile: process.env.FRPROXY_TRANSPORT_CA_CERTFILE || './keys/transport/ca.crt'
  }
}
