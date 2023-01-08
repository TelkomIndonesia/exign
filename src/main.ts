import http from 'http'
import https from 'https'
import tls from 'tls'
import { pki } from 'node-forge'
import { newApp } from './app'
import { newX509Pair, loadX509Pair } from './pki'
import { downloadRemoteConfigs, generatePKIs, newAppConfig } from './config'
import { newLogApp } from './log-app'
import { newSocks5Server } from './socks5'
import { newDNSOverrideServer } from './dns'

async function startServers () {
  const appConfig = newAppConfig()

  const { key: caKey, cert: caCert } = loadX509Pair(appConfig.transport.caKey, appConfig.transport.caCertfile)
  const { key: localhostKey, cert: localhostCert } = newX509Pair('localhost', { caKey, caCert })
  function sniCallback (domain: string, cb: (err: Error | null, ctx?: tls.SecureContext) => void) {
    if (process.env.NODE_ENV === 'debug') {
      console.log(`received SNI request for: ${domain} domain`)
    }

    const { key, cert } = newX509Pair(domain, { caKey, caCert })
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

  const app = newApp(appConfig)
  http.createServer(app)
    .listen(80, () => console.log('[INFO] HTTP Server running on port 80'))
  https.createServer(httpsServerOptions, app)
    .listen(443, () => console.log('[INFO] HTTPS Server running on port 443'))

  newSocks5Server({ hostmap: appConfig.upstreams.hostmap, target: '0.0.0.0' })
    .listen(1080, '0.0.0.0',
      () => console.log('[INFO] SOCKS5 Server listening on port 1080'))

  newDNSOverrideServer({
    hosts: Array.from(appConfig.upstreams.hostmap.keys()),
    address: appConfig.dns.advertisedAddres,
    resolver: appConfig.dns.resolver
  }).listen(53, () => console.log('[INFO] DNS Server listening on port 53'))

  const logapp = newLogApp({ logdb: appConfig.logdb })
  http.createServer(logapp)
    .listen(3000, () => console.log('[INFO] HTTP Config Server running on port 3000'))
}

async function main (args: string[]) {
  if (args.length > 1) {
    return console.error('Invalid arguments.')
  }

  if (args.length > 0) {
    if (args[0] !== 'init') {
      return console.error('Invalid arguments.')
    }

    await generatePKIs()
    await downloadRemoteConfigs()
    return
  }

  startServers()
}

main(process.argv.slice(2))
