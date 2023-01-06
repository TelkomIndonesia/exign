"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const http_1 = tslib_1.__importDefault(require("http"));
const https_1 = tslib_1.__importDefault(require("https"));
const tls_1 = tslib_1.__importDefault(require("tls"));
const node_forge_1 = require("node-forge");
const app_1 = require("./app");
const pki_1 = require("./pki");
const config_1 = require("./config");
const log_app_1 = require("./log-app");
const socks5_1 = require("./socks5");
const dns_1 = require("./dns");
function startServers() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const appConfig = (0, config_1.newAppConfig)();
        const { key: caKey, cert: caCert } = (0, pki_1.loadX509Pair)(appConfig.transport.caKey, appConfig.transport.caCertfile);
        const { key: localhostKey, cert: localhostCert } = (0, pki_1.newX509Pair)('localhost', { caKey, caCert });
        function sniCallback(domain, cb) {
            if (process.env.NODE_ENV === 'debug') {
                console.log(`received SNI request for: ${domain} domain`);
            }
            const { key, cert } = (0, pki_1.newX509Pair)(domain, { caKey, caCert });
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
        const app = (0, app_1.newApp)(appConfig);
        http_1.default.createServer(app)
            .listen(80, () => console.log('[INFO] HTTP Server running on port 80'));
        https_1.default.createServer(httpsServerOptions, app)
            .listen(443, () => console.log('[INFO] HTTPS Server running on port 443'));
        (0, socks5_1.newSocks5Server)({ hostmap: appConfig.hostmap, dstAddrOverride: '0.0.0.0' })
            .listen(1080, '0.0.0.0', () => console.log('[INFO] SOCKS5 Server listening on port 1080'));
        (0, dns_1.newDNSOverrideServer)({
            hostsOverride: Array.from(appConfig.hostmap.keys()),
            target: '0.0.0.0',
            server: appConfig.dns.resolver
        }).listen(53, () => console.log('[INFO] DNS Server listening on port 53'));
        const logapp = (0, log_app_1.newLogApp)({ logdb: appConfig.logdb });
        http_1.default.createServer(logapp)
            .listen(3000, () => console.log('[INFO] HTTP Config Server running on port 3000'));
    });
}
function main(args) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (args.length > 1) {
            return console.error('Invalid arguments.');
        }
        if (args.length > 0) {
            if (args[0] !== 'init') {
                return console.error('Invalid arguments.');
            }
            yield (0, config_1.generatePKIs)();
            yield (0, config_1.downloadRemoteConfigs)();
            return;
        }
        startServers();
    });
}
main(process.argv.slice(2));
//# sourceMappingURL=main.js.map