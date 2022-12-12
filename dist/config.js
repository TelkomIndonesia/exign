"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const tslib_1 = require("tslib");
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
dotenv_1.default.config({ path: process.env.DOTENV_CONFIG_PATH });
exports.config = {
    clientBodyBufferSize: parseInt(process.env.FRPROXY_CLIENT_BODY_BUFFER_SIZE || '') || 8192,
    hostmap: ((_a = process.env.FRPROXY_HOSTMAP) === null || _a === void 0 ? void 0 : _a.split(',').reduce((map, str) => {
        const [host, targethost] = str.trim().split(':');
        map.set(host, targethost);
        return map;
    }, new Map())) ||
        new Map(),
    doubleDashDomains: ((_b = process.env.FRPROXY_DOUBLEDASH_DOMAINS) === null || _b === void 0 ? void 0 : _b.split(',').map(v => v.trim())) || [],
    secure: (process.env.FRPROXY_PROXY_SECURE || 'true') === 'true',
    signature: {
        keyfile: process.env.FRPROXY_SIGNATURE_KEYFILE || './config/signature/key.pem',
        pubkeyfile: process.env.FRPROXY_SIGNATURE_PUBKEYFILE || './config/signature/pubkey.pem'
    },
    transport: {
        caKeyfile: process.env.FRPROXY_TRANSPORT_CA_KEYFILE || './config/frontend-transport/ca-key.pem',
        caCertfile: process.env.FRPROXY_TRANSPORT_CA_CERTFILE || './config/frontend-transport/ca.crt'
    }
};
//# sourceMappingURL=config.js.map