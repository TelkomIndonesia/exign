"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCert = exports.loadPairSync = void 0;
var tslib_1 = require("tslib");
var fs = tslib_1.__importStar(require("fs"));
var node_forge_1 = require("node-forge");
function loadPairSync(keyfile, certfile) {
    var keyPem = fs.readFileSync(keyfile, 'utf8');
    var certPem = fs.readFileSync(certfile, 'utf8');
    var key = node_forge_1.pki.privateKeyFromPem(keyPem);
    var cert = node_forge_1.pki.certificateFromPem(certPem);
    return { key: key, cert: cert };
}
exports.loadPairSync = loadPairSync;
var certificateCache = new Map();
function createCert(domain, opts) {
    var pair = certificateCache.get(domain);
    if (pair) {
        return pair;
    }
    var keys = node_forge_1.pki.rsa.generateKeyPair(2048);
    var cert = node_forge_1.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    var attrs = [
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
    pair = { key: keys.privateKey, cert: cert };
    certificateCache.set(domain, pair);
    return pair;
}
exports.createCert = createCert;
//# sourceMappingURL=certificate.js.map