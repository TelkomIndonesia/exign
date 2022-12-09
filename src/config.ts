export const config = {
  clientBodyBufferSize: parseInt(process.env.FRPROXY_CLIENT_BODY_BUFFER_SIZE || '') || 8192,

  hostmap: process.env.FRPROXY_HOSTMAP
    ?.split(',')
    .reduce((map, str) => {
      const [host, targethost] = str.split(':')
      map.set(host, targethost)
      return map
    }, new Map<string, string>()) ||
    new Map<string, string>(),
  doubleDashDomains: process.env.FRPROXY_DOUBLEDASH_DOMAINS?.split(',') || [],
  secure: (process.env.FRPROXY_PROXY_SECURE || 'true') === 'true',

  signature: {
    keyfile: process.env.FRPROXY_SIGNATURE_KEYFILE || './keys/signature/key.pem',
    pubkeyfile: process.env.FRPROXY_SIGNATURE_PUBKEYFILE || './keys/signature/pubkey.pem'
  },
  transport: {
    caKeyfile: process.env.FRPROXY_TRANSPORT_CA_KEYFILE || './keys/transport/ca-key.pem',
    caCertfile: process.env.FRPROXY_TRANSPORT_CA_CERTFILE || './keys/transport/ca.crt'
  }
}
