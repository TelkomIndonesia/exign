import { readFileSync } from 'fs'
import { pki, md } from 'node-forge'

interface CertPair {
    key: pki.PrivateKey;
    cert: pki.Certificate;
}

export function loadCertPairSync (keyfile: string, certfile: string): CertPair {
  const keyPem = readFileSync(keyfile, 'utf8')
  const certPem = readFileSync(certfile, 'utf8')
  const key = pki.privateKeyFromPem(keyPem)
  const cert = pki.certificateFromPem(certPem)
  return { key, cert }
}

const certificateCache: Map<string, CertPair> = new Map<string, CertPair>()
interface createCertOptions {
    caKey: pki.PrivateKey
    caCert: pki.Certificate
}
export function createCertPair (domain: string, opts: createCertOptions): CertPair {
  let pair = certificateCache.get(domain)
  if (pair) {
    return pair
  }

  const keys = pki.rsa.generateKeyPair(2048)
  const cert = pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  const attrs = [
    { name: 'commonName', value: domain },
    { name: 'countryName', value: 'ID' },
    { shortName: 'ST', value: 'Jakarta' },
    { name: 'localityName', value: 'Jakarta' },
    { name: 'organizationName', value: 'HTTPSig MProxy' },
    { shortName: 'OU', value: 'HTTPSig MProxy' }
  ]
  cert.setSubject(attrs)
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    },
    {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: false,
      emailCA: false,
      objCA: false
    },
    {
      name: 'subjectAltName',
      altNames: [{ type: 2, value: domain }]
    },
    { name: 'subjectKeyIdentifier' }
  ])
  cert.setIssuer(opts.caCert.subject.attributes)
  cert.sign(opts.caKey, md.sha256.create())

  pair = { key: keys.privateKey, cert }
  certificateCache.set(domain, pair)
  return pair
}
