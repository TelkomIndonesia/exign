"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const http_1 = tslib_1.__importDefault(require("http"));
const https_1 = tslib_1.__importDefault(require("https"));
const tls_1 = tslib_1.__importDefault(require("tls"));
const node_forge_1 = require("node-forge");
const express_1 = tslib_1.__importDefault(require("./express"));
const certificate_1 = require("./certificate");
const config_1 = tslib_1.__importDefault(require("./config"));
const app = (0, express_1.default)(config_1.default);
const { key: caKey, cert: caCert } = (0, certificate_1.loadCertPairSync)(config_1.default.transport.caKeyfile, config_1.default.transport.caCertfile);
const { key: localhostKey, cert: localhostCert } = (0, certificate_1.createCertPair)("localhost", { caKey, caCert });
function sniCallback(domain, cb) {
    console.log(`received SNI request for: ${domain} domain`);
    const { key, cert } = (0, certificate_1.createCertPair)(domain, { caKey, caCert });
    cb(null, tls_1.default.createSecureContext({
        key: node_forge_1.pki.privateKeyToPem(key),
        cert: node_forge_1.pki.certificateToPem(cert),
        ca: node_forge_1.pki.certificateToPem(caCert),
    }).context);
}
const httpsServerOptions = {
    SNICallback: sniCallback,
    key: node_forge_1.pki.privateKeyToPem(localhostKey),
    cert: node_forge_1.pki.certificateToPem(localhostCert),
    ca: node_forge_1.pki.certificateToPem(caCert)
};
http_1.default.createServer(app).
    listen(80, () => console.log('HTTP Server running on port 80'));
https_1.default.createServer(httpsServerOptions, app).
    listen(443, () => console.log('HTTPS Server running on port 443'));
//# sourceMappingURL=server.js.map