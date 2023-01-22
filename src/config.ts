import dotenv from 'dotenv'
import { readFileSync, createWriteStream } from 'fs'
import { mkdir, open, readFile } from 'fs/promises'
import { pki } from 'node-forge'
import { dirname, resolve } from 'path'
import { newX509Pair, newECDSAPair } from './pki'
import { IncomingMessage, request as requestHTTP } from 'http'
import { Agent as AgentHTTPS, request as requestHTTPS } from 'https'
import { pipeline } from 'stream/promises'
import { sign } from './signature'
import { digest } from './digest'
import { Readable } from 'stream'
import { simpleGit } from 'simple-git'
import { parseKey } from 'sshpk'

const configDir = process.env.EXIGN_CONFIG_DIRECTORY || 'config'

const remoteConfig = {
  url: process.env.EXIGN_REMOTE_CONFIG_URL,
  secure: process.env.EXIGN_REMOTE_CONFIG_SECURE || 'true'
}

dotenv.config({ path: resolve(configDir, '.env') })

const config = {
  digest: {
    memBufferSize: process.env.EXIGN_DIGEST_MEMORY_BUFFER_SIZE || '8192',
    fileBufferPoolMin: process.env.EXIGN_DIGEST_FILE_BUFFER_POOL_MIN || '8',
    fileBufferPoolMax: process.env.EXIGN_DIGEST_FILE_BUFFER_POOL_MAX || '1024'
  },
  upstreams: {
    hostmap: process.env.EXIGN_UPSTREAMS_HOSTMAP || '',
    doubleDashDomains: process.env.EXIGN_UPSTREAMS_DOUBLEDASH_DOMAINS || '',
    secure: process.env.EXIGN_UPSTREAMS_SECURE || 'true'
  },
  signature: {
    keyfile: resolve(configDir, 'signature/key.pem'),
    pubkeyfile: resolve(configDir, 'signature/pubkey.pem')
  },
  transport: {
    caKeyfile: resolve(configDir, 'transport/ca-key.pem'),
    caCertfile: resolve(configDir, 'transport/ca.crt')
  },
  logdb: {
    directory: process.env.EXIGN_LOGDB_DIRECTORY || 'logs'
  },
  dns: {
    resolver: process.env.EXIGN_DNS_RESOLVER || '1.1.1.1',
    advertisedAddres: process.env.EXIGN_DNS_ADVERTISED_ADDRESS || '0.0.0.0'
  },
  responseVerification: {
    keys: process.env.EXIGN_RESPONSE_VERIFICATION_KEYS
  }
}

function hostmap (str: string) {
  const map = new Map<string, string>()
  if (!str) {
    return map
  }

  return str.split(',')
    .reduce((map, str) => {
      const [host, targethost] = str.trim().split(':')
      map.set(host, targethost || host)
      return map
    }, map)
}

function doubleDashDomains (str: string) {
  if (!str) {
    return []
  }

  return str
    .split(',')
    .map(v => v.trim())
}

function file (name: string) {
  return readFileSync(name, 'utf-8')
}

function publicKeys (str:string) {
  return str.split(',').reduce((m, v) => {
    try {
      const fp = parseKey(v).fingerprint('sha256').toString()
      m.set(fp, v)
    } catch {}
    return m
  }, new Map<string, string>())
}

export function newAppConfig () {
  return {
    digest: {
      memBufferSize: parseInt(config.digest.memBufferSize),
      fileBufferPoolMin: parseInt(config.digest.fileBufferPoolMin),
      fileBufferPoolMax: parseInt(config.digest.fileBufferPoolMax)
    },
    upstreams: {
      hostmap: hostmap(config.upstreams.hostmap),
      doubleDashDomains: doubleDashDomains(config.upstreams.doubleDashDomains),
      secure: config.upstreams.secure === 'true'
    },
    signature: {
      key: file(config.signature.keyfile),
      pubkey: file(config.signature.pubkeyfile)
    },
    transport: {
      caKey: file(config.transport.caKeyfile),
      caCert: file(config.transport.caCertfile)
    },
    logdb: config.logdb,
    dns: config.dns,
    responseVerification: config.responseVerification.keys
      ? { keys: publicKeys(config.responseVerification.keys) }
      : undefined
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
    const { key, cert } = newX509Pair('exign.non')
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
  secure?: boolean
}
async function downloadIfExists (url: URL, location: string, opts?: downloadOptions) {
  await mkdir(dirname(location), { recursive: true })
  const request = url.protocol === 'http:' ? requestHTTP : requestHTTPS
  const agent = url.protocol === 'https:' && opts?.secure !== true ? new AgentHTTPS({ rejectUnauthorized: false }) : undefined
  const req = request(url, { agent })
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
  secure?: boolean,
  signature?: {
    key: string
    pubkey: string
  }
}
export async function downloadRemoteConfigs (opts?: downloadRemoteConfigsOptions) {
  const url = opts?.url || remoteConfig.url
  if (!url) {
    return
  }

  const secure = opts?.secure || remoteConfig.secure === 'true'
  let signature = opts?.signature
  if (!opts) {
    signature = {
      key: await readFile(config.signature.keyfile, 'utf-8'),
      pubkey: await readFile(config.signature.pubkeyfile, 'utf-8')
    }
  }
  const directory = opts?.directory || configDir
  const configNames = ['.env', 'hosts', 'upstream-transport/ca.crt']
  for (const name of configNames) {
    while (true) {
      try {
        const dowloaded = await downloadIfExists(new URL(name, url), resolve(directory, name), { signature, secure })
        dowloaded && console.log(`[INFO] Remote configs '${name}' downloaded`)
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

export async function commitConfig () {
  const git = simpleGit({
    baseDir: configDir,
    config: ['user.name=exign', "user.email='<>'"]
  })

  try {
    await git.init()
    await git.add('.')
    const diff = await git.diffSummary(['--cached'])
    if (diff.files.length === 0) {
      return
    }
    await git.commit('config updated', ['-a'])
  } catch (err) {
    console.log('[WARN] Cannot commit config:', err)
  }
}
