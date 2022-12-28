import { ClientRequest, IncomingHttpHeaders } from 'node:http'
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
const signatureHeader = 'signature'
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
    pubKey?: string
}
export function sign (req: ClientRequest, opts: SignOptions) {
  const addParam = ['(request-target)']
  if (!req.hasHeader('date')) {
    addParam.push('date') // the header will be added by the library
  }

  httpSignature.sign(req, {
    key: opts.key,
    keyId: opts.keyId || (opts.pubKey ? publicKeyFingerprint(opts.pubKey) : ''),
    authorizationHeaderName: signatureHeader,
    headers: Object.keys(req.getHeaders())
      .filter(v => req.getHeader(v) && !hopByHopHeaders.get(v))
      .concat(addParam)
  })
}

interface verifiable{
  httpVersion: string
  method?: string
  url?: string
  headers: IncomingHttpHeaders
}
interface verifiyOptions {
  publicKeys: Map<string, string>
}
export function verify (data: verifiable, opts:verifiyOptions) {
  try {
    const parsed = httpSignature.parseRequest(data, { authorizationHeaderName: signatureHeader })
    const pubKey = opts.publicKeys.get(parsed.keyId)
    if (!pubKey) {
      return { verified: false, error: 'no pub key found' }
    }
    if (!httpSignature.verifySignature(parsed, pubKey)) {
      return { verified: false, error: 'invalid signature' }
    }
  } catch (err) {
    return { verified: false, error: err }
  }
  return { verified: true }
}
