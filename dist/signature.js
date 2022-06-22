"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sign = exports.noVerifyHeaders = exports.digest = void 0;
const tslib_1 = require("tslib");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:stream/promises");
const sshpk_1 = require("sshpk");
const util_1 = require("./util");
const http_signature_1 = tslib_1.__importDefault(require("http-signature"));
function digest(req, opts) {
    var req_1, req_1_1;
    var e_1, _a;
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const digest = new Promise((resolve, reject) => {
            const hash = (0, node_crypto_1.createHash)('sha256');
            req.on('data', chunk => hash.update(chunk))
                .on('error', err => reject(err))
                .on('end', () => {
                const digest = `SHA-256=${hash.digest('base64').toString()}`;
                resolve(digest);
            });
        });
        let body;
        if ((req.headers['content-length'] || 0) > ((opts === null || opts === void 0 ? void 0 : opts.bufferSize) || 8192)) {
            const { filepath, cleanup } = (0, util_1.tmpFilename)();
            yield (0, promises_1.pipeline)(req, (0, node_fs_1.createWriteStream)(filepath));
            body = (0, node_fs_1.createReadStream)(filepath).on('close', () => cleanup());
        }
        else {
            const buffers = [];
            try {
                for (req_1 = tslib_1.__asyncValues(req); req_1_1 = yield req_1.next(), !req_1_1.done;) {
                    const chunk = req_1_1.value;
                    buffers.push(chunk);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (req_1_1 && !req_1_1.done && (_a = req_1.return)) yield _a.call(req_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            body = Buffer.concat(buffers).toString();
        }
        return { digest: yield digest, body };
    });
}
exports.digest = digest;
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
const signatureHeader = 'signature';
exports.noVerifyHeaders = Array.from(hopByHopHeaders.keys()).concat([signatureHeader]);
function keyFingerprint(key) {
    try {
        return (0, sshpk_1.parseKey)(key).fingerprint('sha256').toString();
    }
    catch (_a) {
        return '';
    }
}
function sign(req, opts) {
    const addParam = ['(request-target)'];
    if (!req.hasHeader('date'))
        addParam.push('date'); // the header will be added by the library
    http_signature_1.default.sign(req, {
        key: opts.key,
        keyId: opts.keyId || (opts.pubKey ? keyFingerprint(opts.pubKey) : ''),
        authorizationHeaderName: signatureHeader,
        headers: Object.keys(req.getHeaders())
            .filter(v => req.getHeader(v) && !hopByHopHeaders.get(v.toLowerCase()))
            .concat(addParam)
    });
}
exports.sign = sign;
//# sourceMappingURL=signature.js.map