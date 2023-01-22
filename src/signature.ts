import { ClientRequest, IncomingHttpHeaders, IncomingMessage } from 'node:http'
import { parseKey } from 'sshpk'
import httpSignature from 'http-signature'

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
export const signatureHeader = 'signature'
export const noVerifyHeaders = Array.from(hopByHopHeaders.keys()).concat([signatureHeader])

export function publicKeyFingerprint (key: string): string {
  try {
    return parseKey(key).fingerprint('sha256').toString()
  } catch {
    return ''
  }
}

interface SignOptions {
  key: string
  keyId?: string
  pubkey?: string
}
export function sign (req: ClientRequest, opts: SignOptions) {
  const addParam = ['(request-target)']
  if (!req.hasHeader('date')) {
    addParam.push('date') // the header will be added by the library
  }

  httpSignature.sign(req, {
    key: opts.key,
    keyId: opts.keyId || (opts.pubkey ? publicKeyFingerprint(opts.pubkey) : ''),
    authorizationHeaderName: signatureHeader,
    headers: Object.keys(req.getHeaders())
      .filter(v => req.getHeader(v) && !hopByHopHeaders.get(v))
      .concat(addParam)
  })
}

interface VerifiableMessage {
  method?: string
  url?: string
  httpVersion?: string
  headers: IncomingHttpHeaders
}
interface VerifyOptions {
  publicKeys: Map<string, string>
}
export function verifyMessage (msg: VerifiableMessage, opts: VerifyOptions) {
  try {
    const parsed = httpSignature.parseRequest(msg, { authorizationHeaderName: signatureHeader })
    const pubKey = opts.publicKeys.get(parsed.keyId)
    if (!pubKey) {
      return { verified: false, error: 'no pub key found' }
    }
    if (!httpSignature.verifySignature(parsed, pubKey)) {
      return { verified: false, error: 'invalid signature' }
    }
    return { verified: true }
  } catch (err) {
    return { verified: false, error: err }
  }
}

export async function verify (res: IncomingMessage, opts: VerifyOptions) {
  await new Promise((resolve, reject) => res.once('end', resolve).once('error', reject))

  const msg = { headers: {} as IncomingHttpHeaders }
  for (const [k, v] of Object.entries(res.headers)) {
    msg.headers[k] = v
  }
  for (const [k, v] of Object.entries(res.trailers)) {
    msg.headers[k] = v
  }
  return verifyMessage(msg, { publicKeys: opts.publicKeys })
}
