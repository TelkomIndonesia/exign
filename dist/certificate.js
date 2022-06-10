"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCert = exports.loadPairSync = void 0;
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
const node_forge_1 = require("node-forge");
function loadPairSync(keyfile, certfile) {
    const keyPem = fs.readFileSync(keyfile, 'utf8');
    const certPem = fs.readFileSync(certfile, 'utf8');
    const key = node_forge_1.pki.privateKeyFromPem(keyPem);
    const cert = node_forge_1.pki.certificateFromPem(certPem);
    return { key, cert };
}
exports.loadPairSync = loadPairSync;
const certificateCache = new Map();
function createCert(domain, opts) {
    let pair = certificateCache.get(domain);
    if (pair) {
        return pair;
    }
    const keys = node_forge_1.pki.rsa.generateKeyPair(2048);
    const cert = node_forge_1.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    const attrs = [
        { name: 'commonName', value: domain },
        { name: 'countryName', value: 'ID' },
        { shortName: 'ST', value: 'Jakarta' },
        { name: 'localityName', value: 'Jakarta' },
        { name: 'organizationName', value: 'HTTPSig MProxy' },
        { shortName: 'OU', value: 'HTTPSig MProxy' }
    ];
    cert.setSubject(attrs);
    cert.setExtensions([
        { name: 'basicConstraints', cA: false },
        {
            name: 'keyUsage',
            keyCertSign: true, digitalSignature: true, nonRepudiation: true,
            keyEncipherment: true, dataEncipherment: true
        },
        {
            name: 'extKeyUsage',
            serverAuth: true, clientAuth: true, codeSigning: true,
            emailProtection: true, timeStamping: true
        },
        {
            name: 'nsCertType',
            client: true, server: true, email: true, objsign: true,
            sslCA: false, emailCA: false, objCA: false
        },
        {
            name: 'subjectAltName',
            altNames: [{ type: 2, value: domain }]
        },
        { name: 'subjectKeyIdentifier' }
    ]);
    cert.setIssuer(opts.caCert.subject.attributes);
    cert.sign(opts.caKey, node_forge_1.md.sha256.create());
    pair = { key: keys.privateKey, cert };
    certificateCache.set(domain, pair);
    return pair;
}
exports.createCert = createCert;
//# sourceMappingURL=certificate.js.map