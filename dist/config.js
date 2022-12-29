"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const tslib_1 = require("tslib");
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const fs_1 = require("fs");
dotenv_1.default.config({ path: process.env.DOTENV_CONFIG_PATH });
function hostmap() {
    var _a;
    const map = new Map();
    return ((_a = process.env.FRPROXY_HOSTMAP) === null || _a === void 0 ? void 0 : _a.split(',').reduce((map, str) => {
        const [host, targethost] = str.trim().split(':');
        map.set(host, targethost);
        return map;
    }, map)) || map;
}
function doubleDashDomains() {
    var _a;
    return ((_a = process.env.FRPROXY_DOUBLEDASH_DOMAINS) === null || _a === void 0 ? void 0 : _a.split(',').map(v => v.trim())) || [];
}
function file(name) {
    return (0, fs_1.readFileSync)(name, 'utf-8');
}
exports.config = {
    clientBodyBufferSize: parseInt(process.env.FRPROXY_CLIENT_BODY_BUFFER_SIZE || '') || 8192,
    hostmap: hostmap(),
    doubleDashDomains: doubleDashDomains(),
    secure: (process.env.FRPROXY_PROXY_SECURE || 'true') === 'true',
    signature: {
        keyfile: file(process.env.FRPROXY_SIGNATURE_KEYFILE || './config/signature/key.pem'),
        pubkeyfile: file(process.env.FRPROXY_SIGNATURE_PUBKEYFILE || './config/signature/pubkey.pem')
    },
    transport: {
        caKeyfile: file(process.env.FRPROXY_TRANSPORT_CA_KEYFILE || './config/transport/ca-key.pem'),
        caCertfile: file(process.env.FRPROXY_TRANSPORT_CA_CERTFILE || './config/transport/ca.crt')
    }
};
//# sourceMappingURL=config.js.map