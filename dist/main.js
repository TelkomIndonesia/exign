"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const http_1 = tslib_1.__importDefault(require("http"));
const https_1 = tslib_1.__importDefault(require("https"));
const tls_1 = tslib_1.__importDefault(require("tls"));
const node_forge_1 = require("node-forge");
const app_1 = require("./app");
const certificate_1 = require("./certificate");
const config_1 = require("./config");
const log_app_1 = require("./log-app");
const socks5_1 = require("./socks5");
require('express-async-errors');
const { key: caKey, cert: caCert } = (0, certificate_1.loadCertPairSync)(config_1.config.transport.caKeyfile, config_1.config.transport.caCertfile);
const { key: localhostKey, cert: localhostCert } = (0, certificate_1.createCertPair)('localhost', { caKey, caCert });
function sniCallback(domain, cb) {
    console.log(`received SNI request for: ${domain} domain`);
    const { key, cert } = (0, certificate_1.createCertPair)(domain, { caKey, caCert });
    cb(null, tls_1.default.createSecureContext({
        key: node_forge_1.pki.privateKeyToPem(key),
        cert: node_forge_1.pki.certificateToPem(cert),
        ca: node_forge_1.pki.certificateToPem(caCert)
    }).context);
}
const httpsServerOptions = {
    SNICallback: sniCallback,
    key: node_forge_1.pki.privateKeyToPem(localhostKey),
    cert: node_forge_1.pki.certificateToPem(localhostCert),
    ca: node_forge_1.pki.certificateToPem(caCert)
};
const app = (0, app_1.newApp)(config_1.config);
http_1.default.createServer(app)
    .listen(80, () => console.log('HTTP Server running on port 80'));
https_1.default.createServer(httpsServerOptions, app)
    .listen(443, () => console.log('HTTPS Server running on port 443'));
(0, socks5_1.newSocks5Server)(config_1.config).listen(1080, '0.0.0.0', function () {
    console.log('SOCKS5 Server listening on port 1080');
});
const logapp = (0, log_app_1.newLogApp)({ logdb: config_1.config.logdb });
http_1.default.createServer(logapp)
    .listen(3000, () => console.log('HTTP Server running on port 3000'));
//# sourceMappingURL=main.js.map