"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = exports.verifyMessage = exports.sign = exports.publicKeyFingerprint = exports.noVerifyHeaders = exports.signatureHeader = void 0;
const tslib_1 = require("tslib");
const sshpk_1 = require("sshpk");
const http_signature_1 = tslib_1.__importDefault(require("http-signature"));
const hopByHopHeaders = new Map([
    ['keep-alive', true],
    ['transfer-encoding', true],
    ['te', true],
    ['connection', true],
    ['trailer', true],
    ['upgrade', true],
    ['proxy-authenticate', true],
    ['proxy-authorization', true]
]);
exports.signatureHeader = 'signature';
exports.noVerifyHeaders = Array.from(hopByHopHeaders.keys()).concat([exports.signatureHeader]);
function publicKeyFingerprint(key) {
    try {
        return (0, sshpk_1.parseKey)(key).fingerprint('sha256').toString();
    }
    catch (_a) {
        return '';
    }
}
exports.publicKeyFingerprint = publicKeyFingerprint;
function sign(req, opts) {
    const addParam = ['(request-target)'];
    if (!req.hasHeader('date')) {
        addParam.push('date'); // the header will be added by the library
    }
    http_signature_1.default.sign(req, {
        key: opts.key,
        keyId: opts.keyId || (opts.pubkey ? publicKeyFingerprint(opts.pubkey) : ''),
        authorizationHeaderName: exports.signatureHeader,
        headers: Object.keys(req.getHeaders())
            .filter(v => req.getHeader(v) && !hopByHopHeaders.get(v))
            .concat(addParam)
    });
}
exports.sign = sign;
function verifyMessage(msg, opts) {
    try {
        const parsed = http_signature_1.default.parseRequest(msg, { authorizationHeaderName: exports.signatureHeader });
        const pubKey = opts.publicKeys.get(parsed.keyId);
        if (!pubKey) {
            return { verified: false, error: 'no pub key found' };
        }
        if (!http_signature_1.default.verifySignature(parsed, pubKey)) {
            return { verified: false, error: 'invalid signature' };
        }
        return { verified: true };
    }
    catch (err) {
        return { verified: false, error: err };
    }
}
exports.verifyMessage = verifyMessage;
function verify(res, opts) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield new Promise((resolve, reject) => res.once('end', resolve).once('error', reject));
        const msg = { headers: {} };
        for (const [k, v] of Object.entries(res.headers)) {
            msg.headers[k] = v;
        }
        for (const [k, v] of Object.entries(res.trailers)) {
            msg.headers[k] = v;
        }
        return verifyMessage(msg, { publicKeys: opts.publicKeys });
    });
}
exports.verify = verify;
//# sourceMappingURL=signature.js.map