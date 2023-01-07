import { pki, md } from 'node-forge'
import { randomBytes } from 'crypto'
import { generatePrivateKey } from 'sshpk'

interface x509Pair {
  key: pki.PrivateKey;
  cert: pki.Certificate;
}

export function loadX509Pair (keyPem: string, certPem: string): x509Pair {
  const key = pki.privateKeyFromPem(keyPem)
  const cert = pki.certificateFromPem(certPem)
  return { key, cert }
}

const certificateCache: Map<string, x509Pair> = new Map<string, x509Pair>()
interface createCertOptions {
  caKey?: pki.PrivateKey
  caCert?: pki.Certificate
}
export function newX509Pair (domain: string, opts?: createCertOptions): x509Pair {
  let pair = certificateCache.get(domain)
  if (pair) {
    return pair
  }

  const keys = pki.rsa.generateKeyPair(2048)
  const cert = pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = randomBytes(20).toString('hex').match(/.{1,2}/g)?.join(':') || '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  const attrs = [
    { name: 'commonName', value: domain },
    { name: 'countryName', value: 'ID' },
    { shortName: 'ST', value: 'West Java' },
    { name: 'localityName', value: 'Bandung' },
    { name: 'organizationName', value: 'httpsig-frproxy' },
    { shortName: 'OU', value: 'httpsig-frproxy' }
  ]
  cert.setSubject(attrs)
  cert.setExtensions([
    { name: 'basicConstraints', cA: !opts?.caKey },
    {
      name: 'keyUsage',
      critical: true,
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
      sslCA: !opts?.caKey,
      emailCA: !opts?.caKey,
      objCA: !opts?.caKey
    },
    {
      name: 'subjectAltName',
      altNames: [{ type: 2, value: domain }]
    },
    { name: 'subjectKeyIdentifier' }
  ])
  cert.setIssuer(opts?.caCert?.subject.attributes || attrs)
  cert.sign(opts?.caKey || keys.privateKey, md.sha256.create())

  pair = { key: keys.privateKey, cert }
  certificateCache.set(domain, pair)
  return pair
}

export function newECDSAPair () {
  const key = generatePrivateKey('ecdsa', { curve: 'nistp256' })
  return { key, publicKey: key.toPublic() }
}
