import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { ClientRequest } from 'node:http'
import { Readable, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { parseKey } from 'sshpk'
import { tmpFilename } from './util'
import httpSignature from 'http-signature'

interface DigestOptions {
    bufferSize?: number
}
export async function digest (input: Readable, opts?: DigestOptions): Promise<{ digest: string, data: Readable }> {
  const hash = createHash('sha256')
  const hashpipe = pipeline(input, hash)

  const buffers = []
  const maxBufSize = opts?.bufferSize || 8192
  let filepath: string | undefined
  let cleanup: (() => void) | undefined
  let tmpFile: Writable | undefined
  for await (const chunk of input) {
    if (!tmpFile && buffers.length + chunk.length <= maxBufSize) {
      buffers.push(chunk)
      continue
    }

    if (!tmpFile) {
      ({ filepath, cleanup } = tmpFilename())
      tmpFile = createWriteStream(filepath)
      tmpFile.write(Buffer.from(buffers))
    }

    const ok = tmpFile.write(chunk)
    if (!ok) {
      await new Promise(resolve => tmpFile?.on('drain', resolve))
    }
  }

  await hashpipe; const digest = 'SHA-256=' + hash.digest('base64').toString()

  let data: Readable
  if (tmpFile && filepath && cleanup) {
    tmpFile.end()
    data = createReadStream(filepath).on('close', cleanup)
  } else {
    data = Readable.from(buffers)
  }

  return { data, digest }
}

const hopByHopHeaders = new Map<string, boolean>([
  ['keep-alive', true],
  ['transfer-encoding', true],
  ['te', true],
  ['connection', true],
  ['trailer', true],
  ['upgrade', true],
  ['proxy-authenticate', true],
  ['proxy-authorization', true]
])
const signatureHeader = 'signature'
export const noVerifyHeaders = Array.from(hopByHopHeaders.keys()).concat([signatureHeader])

function keyFingerprint (key: string): string {
  try {
    return parseKey(key).fingerprint('sha256').toString()
  } catch {
    return ''
  }
}
interface SignOptions {
    key: string
    keyId?: string
    pubKey?: string
}
export function sign (req: ClientRequest, opts: SignOptions) {
  const addParam = ['(request-target)']
  if (!req.hasHeader('date')) {
    addParam.push('date') // the header will be added by the library
  }

  httpSignature.sign(req, {
    key: opts.key,
    keyId: opts.keyId || (opts.pubKey ? keyFingerprint(opts.pubKey) : ''),
    authorizationHeaderName: signatureHeader,
    headers: Object.keys(req.getHeaders())
      .filter(v => req.getHeader(v) && !hopByHopHeaders.get(v.toLowerCase()))
      .concat(addParam)
  })
}
