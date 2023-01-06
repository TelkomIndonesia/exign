import dotenv from 'dotenv'
import { mkdirSync, readFileSync, createWriteStream } from 'fs'
import { mkdir, open, readFile } from 'fs/promises'
import { pki } from 'node-forge'
import { dirname, resolve } from 'path'
import { newX509Pair, newECDSAPair } from './pki'
import { IncomingMessage, request as requestHTTP } from 'http'
import { request as requestHTTPS } from 'https'
import { pipeline } from 'stream/promises'
import { sign } from './signature'
import { digest } from './digest'
import { Readable } from 'stream'

const config = {
  clientBodyBufferSize: process.env.FRPROXY_CLIENT_BODY_BUFFER_SIZE || '8192',

  hostmap: process.env.FRPROXY_HOSTMAP || '',
  doubleDashDomains: process.env.FRPROXY_DOUBLEDASH_DOMAINS || '',
  secure: process.env.FRPROXY_PROXY_SECURE || 'true',

  signature: {
    keyfile: process.env.FRPROXY_SIGNATURE_KEYFILE || './config/signature/key.pem',
    pubkeyfile: process.env.FRPROXY_SIGNATURE_PUBKEYFILE || './config/signature/pubkey.pem'
  },
  transport: {
    caKeyfile: process.env.FRPROXY_TRANSPORT_CA_KEYFILE || './config/transport/ca-key.pem',
    caCertfile: process.env.FRPROXY_TRANSPORT_CA_CERTFILE || './config/transport/ca.crt'
  },
  logdb: {
    directory: process.env.FRPROXY_LOGDB_DIRECTORY || './logs'
  },

  remoteConfig: {
    url: process.env.FRPROXY_REMOTE_CONFIG_URL,
    directory: process.env.FRPROXY_REMOTE_CONFIG_DIRECTORY || './config'
  }
}

dotenv.config({ path: resolve(config.remoteConfig.directory, '.env') })

function hostmap (str: string) {
  const map = new Map<string, string>()
  return str.split(',')
    .reduce((map, str) => {
      const [host, targethost] = str.trim().split(':')
      map.set(host, targethost)
      return map
    }, map)
}

function doubleDashDomains (str: string) {
  return str
    ?.split(',')
    .map(v => v.trim()) || []
}

function file (name: string) {
  return readFileSync(name, 'utf-8')
}

function dir (name: string) {
  mkdirSync(name, { recursive: true })
  return name
}

export function newAppConfig () {
  return {
    clientBodyBufferSize: parseInt(config.clientBodyBufferSize),

    hostmap: hostmap(config.hostmap),
    doubleDashDomains: doubleDashDomains(config.doubleDashDomains),
    secure: config.secure === 'true',

    signature: {
      key: file(config.signature.keyfile),
      pubkey: file(config.signature.pubkeyfile)
    },
    transport: {
      caKey: file(config.transport.caKeyfile),
      caCertfile: file(config.transport.caCertfile)
    },
    logdb: {
      directory: dir(config.logdb.directory)
    }
  }
}

async function writeFilesIfNotExist (...files: [string, string][]) {
  try {
    await Promise.all(files.map(v => mkdir(dirname(v[0]), { recursive: true })))
    const handles = await Promise.all(files.map(v => open(v[0], 'wx')))
    for (let i = 0; i < handles.length; i++) {
      await handles[i].write(files[i][1])
      await handles[i].close()
    }
    return true
  } catch (err) {
    if (!(typeof err === 'object' && err && 'code' in err && err.code === 'EEXIST')) {
      throw err
    }
    return false
  }
}

interface generatePKIsOptions {
  signature: {
    keyfile: string
    pubkeyfile: string
  },
  transport: {
    caKeyfile: string
    caCertfile: string
  },
}
export async function generatePKIs (opts?: generatePKIsOptions) {
  opts = opts || config
  {
    const { key, publicKey } = newECDSAPair()
    const created = await writeFilesIfNotExist(
      [opts.signature.keyfile, key.toString('pkcs8')],
      [opts.signature.pubkeyfile, publicKey.toString('pkcs8')]
    )
    created ? console.log('[INFO] Signature keys created') : console.log('[INFO] Signature keys exists')
  }

  {
    const { key, cert } = newX509Pair('httpsig-frproxy.non')
    const created = await writeFilesIfNotExist(
      [opts.transport.caKeyfile, pki.privateKeyToPem(key)],
      [opts.transport.caCertfile, pki.certificateToPem(cert)]
    )
    created ? console.log('[INFO] Transport keys created') : console.log('[INFO] Transport keys exists')
  }
}

interface downloadOptions {
  signature?: {
    key: string
    pubkey: string
  }
}
async function downloadIfExists (url: URL, location: string, opts?: downloadOptions) {
  await mkdir(dirname(location), { recursive: true })

  const request = url.protocol === 'http' ? requestHTTP : requestHTTPS
  const req = request(url)
  if (opts?.signature) {
    req.setHeader('digest', await digest(Readable.from([], { objectMode: false })))
    sign(req, opts.signature)
  }

  const res = await new Promise<IncomingMessage>((resolve, reject) =>
    req.on('response', resolve).on('error', reject).end()
  )
  if (res.statusCode !== 200 && res.statusCode !== 404) {
    throw new Error(`unexpected status code: ${res.statusCode}`)
  }
  if (res.statusCode === 404) {
    return false
  }

  await pipeline(res, createWriteStream(location))
  return true
}

interface downloadRemoteConfigsOptions {
  url: string,
  directory: string,
  signature?: {
    key: string
    pubkey: string
  }
}
export async function downloadRemoteConfigs (opts?: downloadRemoteConfigsOptions) {
  const url = opts?.url || config.remoteConfig.url
  if (!url) {
    return
  }

  const directory = opts?.directory || config.remoteConfig.directory
  let signature = opts?.signature
  if (!opts) {
    signature = {
      key: await readFile(config.signature.keyfile, 'utf-8'),
      pubkey: await readFile(config.signature.pubkeyfile, 'utf-8')
    }
  }
  const configNames = ['.env', 'hosts', 'backend-transport/ca.crt']
  for (const name of configNames) {
    while (true) {
      try {
        await downloadIfExists(new URL(name, url), resolve(directory, name), { signature })
        console.log(`[INFO] Remote configs '${name}' downloaded`)
        break
      } catch (err) {
        if (err instanceof Error) {
          console.error(`[WARN] Download '${name}' failed (${err.message}). Make sure your public key has been whitelisted at the remote server. Retrying...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
  }
}
