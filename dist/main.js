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
const mgmt_app_1 = require("./mgmt-app");
const socks5_1 = require("./socks5");
const dns_1 = require("./dns");
const log_1 = require("./log");
function newHTTPSServerOptions(caKeyStr, caCertStr) {
    const { key: caKey, cert: caCert } = (0, pki_1.loadX509Pair)(caKeyStr, caCertStr);
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
    return {
        SNICallback: sniCallback,
        key: node_forge_1.pki.privateKeyToPem(localhostKey),
        cert: node_forge_1.pki.certificateToPem(localhostCert),
        ca: node_forge_1.pki.certificateToPem(caCert)
    };
}
function startServers() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const cfg = (0, config_1.newAppConfig)();
        const logDB = new log_1.LogDB(cfg.logdb);
        const app = (0, app_1.newApp)(Object.assign(Object.assign({}, cfg), { logDB }));
        const srv1 = http_1.default.createServer(app)
            .listen(80, () => console.log('[INFO] HTTP Server running on port 80'));
        const srv2 = https_1.default.createServer(newHTTPSServerOptions(cfg.transport.caKey, cfg.transport.caCert), app)
            .listen(443, () => console.log('[INFO] HTTPS Server running on port 443'));
        const srv3 = (0, socks5_1.newSocks5Server)({
            target: '0.0.0.0',
            hosts: cfg.upstreams.hostmap,
            ports: new Map([[80, true], [443, true]])
        }).listen(1080, '0.0.0.0', () => console.log('[INFO] SOCKS5 Server listening on port 1080'));
        const srv4 = (0, dns_1.newDNSOverrideServer)({
            hosts: Array.from(cfg.upstreams.hostmap.keys()),
            address: cfg.dns.advertisedAddres,
            resolver: cfg.dns.resolver
        }).listen(53, () => console.log('[INFO] DNS Server listening on port 53'));
        const srv5 = http_1.default.createServer((0, mgmt_app_1.newMgmtApp)(Object.assign(Object.assign({}, cfg), { logDB })))
            .listen(3000, () => console.log('[INFO] HTTP Management Server running on port 3000'));
        const shutdown = function close() {
            console.log('[WARN] Closing...');
            [logDB, srv1, srv2, srv3, srv4, srv5]
                .map((v) => v.close());
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    });
}
function init() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield (0, config_1.generatePKIs)();
        const cfg = (0, config_1.newAppConfig)();
        const logDB = new log_1.LogDB(cfg.logdb);
        const mgmtServer = http_1.default.createServer((0, mgmt_app_1.newMgmtApp)(Object.assign(Object.assign({}, cfg), { logDB })))
            .listen(3000, () => console.log('[INFO] HTTP Management Server running on port 3000'));
        yield (0, config_1.downloadRemoteConfigs)();
        yield (0, config_1.commitConfig)();
        logDB.close();
        mgmtServer.close();
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
            return init();
        }
        startServers();
    });
}
main(process.argv.slice(2));
//# sourceMappingURL=main.js.map