import dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH })

function hostmap () {
  const map = new Map<string, string>()
  return process.env.FRPROXY_HOSTMAP
    ?.split(',')
    .reduce((map, str) => {
      const [host, targethost] = str.trim().split(':')
      map.set(host, targethost)
      return map
    }, map) || map
}

function doubleDashDomains () {
  return process.env.FRPROXY_DOUBLEDASH_DOMAINS
    ?.split(',')
    .map(v => v.trim()) || []
}

function file (name:string) {
  return readFileSync(name, 'utf-8')
}

export const config = {
  clientBodyBufferSize: parseInt(process.env.FRPROXY_CLIENT_BODY_BUFFER_SIZE || '') || 8192,

  hostmap: hostmap(),
  doubleDashDomains: doubleDashDomains(),
  secure: (process.env.FRPROXY_PROXY_SECURE || 'true') === 'true',

  signature: {
    keyfile: file(process.env.FRPROXY_SIGNATURE_KEYFILE || './config/signature/key.pem'),
    pubkeyfile: file(process.env.FRPROXY_SIGNATURE_PUBKEYFILE || './config/signature/pubkey.pem')
  },
  transport: {
    caKeyfile: file(process.env.FRPROXY_TRANSPORT_CA_KEYFILE || './config/frontend-transport/ca-key.pem'),
    caCertfile: file(process.env.FRPROXY_TRANSPORT_CA_CERTFILE || './config/frontend-transport/ca.crt')
  }
}
