"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const fs_1 = require("fs");
function loadHostMap() {
    const map = new Map();
    const path = process.env.FRPROXY_HOSTMAP_PATH;
    if (!path) {
        return map;
    }
    try {
        const file = (0, fs_1.readFileSync)(path, 'utf-8');
        const doc = JSON.parse(file);
        if (!doc.hostmap) {
            return map;
        }
        for (const [k, v] of Object.entries(doc.hostmap)) {
            if (typeof (v) !== 'string') {
                continue;
            }
            map.set(k, v);
        }
    }
    catch (err) { }
    return map;
}
exports.config = {
    clientBodyBufferSize: parseInt(process.env.FRPROXY_CLIENT_BODY_BUFFER_SIZE || '') || 8192,
    hostmap: loadHostMap(),
    doubleDashDomains: ((_a = process.env.FRPROXY_DOUBLEDASH_DOMAINS) === null || _a === void 0 ? void 0 : _a.split(',')) || [],
    signature: {
        keyfile: process.env.FRPROXY_SIGNATURE_KEYFILE || './keys/signature/key.pem',
        pubkeyfile: process.env.FRPROXY_SIGNATURE_PUBKEYFILE || './keys/signature/pubkey.pem'
    },
    transport: {
        caKeyfile: process.env.FRPROXY_TRANSPORT_CA_KEYFILE || './keys/transport/ca-key.pem',
        caCertfile: process.env.FRPROXY_TRANSPORT_CA_CERTFILE || './keys/transport/ca.crt'
    }
};
//# sourceMappingURL=config.js.map