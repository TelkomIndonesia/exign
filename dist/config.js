"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    clientBodyBufferSize: parseInt(process.env.MPROXY_FRONT_CLIENT_BODY_BUFFER_SIZE || '') || 8192,
    doubleDashParentDomains: ((_a = process.env.MPROXY_FRONT_DOUBLEDASH_PARENT_DOMAINS) === null || _a === void 0 ? void 0 : _a.split(',')) || [],
    signature: {
        keyfile: process.env.MPROXY_FRONT_SIGNATURE_KEYFILE || './keys/signature/key.pem',
        pubkeyfile: process.env.MPROXY_FRONT_SIGNATURE_PUBKEYFILE || './keys/signature/pubkey.pem'
    },
    transport: {
        caKeyfile: process.env.MPROXY_FRONT_TRANSPORT_CA_KEYFILE || './keys/transport/ca-key.pem',
        caCertfile: process.env.MPROXY_FRONT_TRANSPORT_CA_CERTFILE || './keys/transport/ca.crt'
    }
};
//# sourceMappingURL=config.js.map