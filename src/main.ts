import http from 'http'
import https, { ServerOptions } from 'https'
import tls from 'tls'
import { pki } from 'node-forge'
import { newApp } from './app'
import { newX509Pair, loadX509Pair } from './pki'
import { commitConfig, downloadRemoteConfigs, generatePKIs, newAppConfig } from './config'
import { newMgmtApp } from './mgmt-app'
import { newSocks5Server } from './socks5'
import { newDNSOverrideServer } from './dns'
import { LogDB } from './log'

function newHTTPSServerOptions (caKeyStr: string, caCertStr: string): ServerOptions {
  const { key: caKey, cert: caCert } = loadX509Pair(caKeyStr, caCertStr)
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

  return {
    SNICallback: sniCallback,
    key: pki.privateKeyToPem(localhostKey),
    cert: pki.certificateToPem(localhostCert),
    ca: pki.certificateToPem(caCert)
  }
}

async function startServers () {
  const cfg = newAppConfig()
  const logDB = new LogDB(cfg.logdb)

  const app = newApp({ ...cfg, logDB })
  const srv1 = http.createServer(app)
    .listen(80, () => console.log('[INFO] HTTP Server running on port 80'))
  const srv2 = https.createServer(newHTTPSServerOptions(cfg.transport.caKey, cfg.transport.caCert), app)
    .listen(443, () => console.log('[INFO] HTTPS Server running on port 443'))

  const srv3 = newSocks5Server({
    target: '0.0.0.0',
    hosts: cfg.upstreams.hostmap,
    ports: new Map([[80, true], [443, true]])
  }).listen(1080, '0.0.0.0', () => console.log('[INFO] SOCKS5 Server listening on port 1080'))

  const srv4 = newDNSOverrideServer({
    hosts: Array.from(cfg.upstreams.hostmap.keys()),
    address: cfg.dns.advertisedAddres,
    resolver: cfg.dns.resolver
  }).listen(53, () => console.log('[INFO] DNS Server listening on port 53'))

  const srv5 = http.createServer(newMgmtApp({ ...cfg, logDB }))
    .listen(3000, () => console.log('[INFO] HTTP Management Server running on port 3000'))

  const shutdown = function close () {
    console.log('[WARN] Closing...');
    [logDB, srv1, srv2, srv3, srv4, srv5]
      .map((v: {close: () => void}) => v.close())
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

async function init () {
  await generatePKIs()

  const cfg = newAppConfig()
  const logDB = new LogDB(cfg.logdb)
  const mgmtServer = http.createServer(newMgmtApp({ ...cfg, logDB }))
    .listen(3000, () => console.log('[INFO] HTTP Management Server running on port 3000'))

  await downloadRemoteConfigs()
  await commitConfig()
  logDB.close()
  mgmtServer.close()
}

async function main (args: string[]) {
  if (args.length > 1) {
    return console.error('Invalid arguments.')
  }

  if (args.length > 0) {
    if (args[0] !== 'init') {
      return console.error('Invalid arguments.')
    }

    return init()
  }

  startServers()
}

main(process.argv.slice(2))
