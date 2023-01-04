import http from 'http'
import https from 'https'
import tls from 'tls'
import { pki } from 'node-forge'
import { newApp } from './app'
import { createCertPair, loadCertPairSync } from './certificate'
import { config } from './config'
import { newLogApp } from './log-app'
import { newSocks5Server } from './socks5'
require('express-async-errors')

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

const app = newApp(config)
http.createServer(app)
  .listen(80, () => console.log('HTTP Server running on port 80'))
https.createServer(httpsServerOptions, app)
  .listen(443, () => console.log('HTTPS Server running on port 443'))

newSocks5Server(config).listen(1080, '0.0.0.0', function () {
  console.log('SOCKS5 Server listening on port 1080')
})

const logapp = newLogApp({ logdb: config.logdb })
http.createServer(logapp)
  .listen(3000, () => console.log('HTTP Server running on port 3000'))
