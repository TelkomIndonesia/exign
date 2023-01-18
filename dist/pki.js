"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newECDSAPair = exports.newX509Pair = exports.loadX509Pair = void 0;
const node_forge_1 = require("node-forge");
const crypto_1 = require("crypto");
const sshpk_1 = require("sshpk");
function loadX509Pair(keyPem, certPem) {
    const key = node_forge_1.pki.privateKeyFromPem(keyPem);
    const cert = node_forge_1.pki.certificateFromPem(certPem);
    return { key, cert };
}
exports.loadX509Pair = loadX509Pair;
const certificateCache = new Map();
function newX509Pair(domain, opts) {
    var _a, _b;
    let pair = certificateCache.get(domain);
    if (pair) {
        return pair;
    }
    const keys = node_forge_1.pki.rsa.generateKeyPair(2048);
    const cert = node_forge_1.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = ((_a = (0, crypto_1.randomBytes)(20).toString('hex').match(/.{1,2}/g)) === null || _a === void 0 ? void 0 : _a.join(':')) || '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    const attrs = [
        { name: 'commonName', value: domain },
        { name: 'countryName', value: 'ID' },
        { shortName: 'ST', value: 'West Java' },
        { name: 'localityName', value: 'Bandung' },
        { name: 'organizationName', value: 'exign' },
        { shortName: 'OU', value: 'exign' }
    ];
    cert.setSubject(attrs);
    cert.setExtensions([
        { name: 'basicConstraints', cA: !(opts === null || opts === void 0 ? void 0 : opts.caKey) },
        {
            name: 'keyUsage',
            critical: true,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true,
            keyCertSign: !(opts === null || opts === void 0 ? void 0 : opts.caKey)
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
            sslCA: !(opts === null || opts === void 0 ? void 0 : opts.caKey),
            emailCA: !(opts === null || opts === void 0 ? void 0 : opts.caKey),
            objCA: !(opts === null || opts === void 0 ? void 0 : opts.caKey)
        },
        {
            name: 'subjectAltName',
            altNames: [{ type: 2, value: domain }]
        },
        { name: 'subjectKeyIdentifier' }
    ]);
    cert.setIssuer(((_b = opts === null || opts === void 0 ? void 0 : opts.caCert) === null || _b === void 0 ? void 0 : _b.subject.attributes) || attrs);
    cert.sign((opts === null || opts === void 0 ? void 0 : opts.caKey) || keys.privateKey, node_forge_1.md.sha256.create());
    pair = { key: keys.privateKey, cert };
    certificateCache.set(domain, pair);
    return pair;
}
exports.newX509Pair = newX509Pair;
function newECDSAPair() {
    const key = (0, sshpk_1.generatePrivateKey)('ecdsa', { curve: 'nistp256' });
    return { key, publicKey: key.toPublic() };
}
exports.newECDSAPair = newECDSAPair;
//# sourceMappingURL=pki.js.map