#!/usr/bin/env node

import http from 'http'
import https from 'https'
import tls from 'tls'
import { pki } from 'node-forge'
import newApp from './express'
import { createCertPair, loadCertPairSync } from './certificate'
import config from './config'

const app = newApp(config)
const { key: caKey, cert: caCert } = loadCertPairSync(config.transport.caKeyfile, config.transport.caCertfile)
const { key: localhostKey, cert: localhostCert } = createCertPair('localhost', { caKey, caCert })
function sniCallback (domain: string, cb: (err: Error | null, ctx?: tls.SecureContext) => void) {
  console.log(`received SNI request for: ${domain} domain`)
  const { key, cert } = createCertPair(domain, { caKey, caCert })
  cb(null, tls.createSecureContext({
    key: pki.privateKeyToPem(key),
    cert: pki.certificateToPem(cert),
    ca: pki.certificateToPem(caCert)
  }).context)
}
const httpsServerOptions = {
  SNICallback: sniCallback,
  key: pki.privateKeyToPem(localhostKey),
  cert: pki.certificateToPem(localhostCert),
  ca: pki.certificateToPem(caCert)
}

http.createServer(app)
  .listen(80, () => console.log('HTTP Server running on port 80'))
https.createServer(httpsServerOptions, app)
  .listen(443, () => console.log('HTTPS Server running on port 443'))
