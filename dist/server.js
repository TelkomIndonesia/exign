"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var express_1 = tslib_1.__importDefault(require("./express"));
var http_1 = tslib_1.__importDefault(require("http"));
var https_1 = tslib_1.__importDefault(require("https"));
var tls_1 = tslib_1.__importDefault(require("tls"));
var certificate_1 = require("./certificate");
var node_forge_1 = require("node-forge");
var config_1 = tslib_1.__importDefault(require("./config"));
var _a = (0, certificate_1.loadPairSync)(config_1.default.transport.caKeyfile, config_1.default.transport.caCertfile), caKey = _a.key, caCert = _a.cert;
var _b = (0, certificate_1.createCert)("localhost", { caKey: caKey, caCert: caCert }), localhostKey = _b.key, localhostCert = _b.cert;
http_1.default.createServer(express_1.default).
    listen(80, function () { return console.log('HTTP Server running on port 80'); });
https_1.default.createServer({
    SNICallback: function (domain, cb) {
        var _a = (0, certificate_1.createCert)(domain, { caKey: caKey, caCert: caCert }), key = _a.key, cert = _a.cert;
        cb(null, tls_1.default.createSecureContext({
            key: node_forge_1.pki.privateKeyToPem(key),
            cert: node_forge_1.pki.certificateToPem(cert),
            ca: node_forge_1.pki.certificateToPem(caCert),
        }).context);
    },
    key: node_forge_1.pki.privateKeyToPem(localhostKey),
    cert: node_forge_1.pki.certificateToPem(localhostCert),
    ca: node_forge_1.pki.certificateToPem(caCert)
}, express_1.default).
    listen(443, function () { return console.log('HTTPS Server running on port 443'); });
//# sourceMappingURL=server.js.map