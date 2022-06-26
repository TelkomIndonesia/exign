"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sign = exports.noVerifyHeaders = exports.digest = void 0;
const tslib_1 = require("tslib");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_stream_1 = require("node:stream");
const promises_1 = require("node:stream/promises");
const sshpk_1 = require("sshpk");
const util_1 = require("./util");
const http_signature_1 = tslib_1.__importDefault(require("http-signature"));
function digest(input, opts) {
    var input_1, input_1_1;
    var e_1, _a;
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const hash = (0, node_crypto_1.createHash)('sha256');
        const hashpipe = (0, promises_1.pipeline)(input, hash);
        const buffers = [];
        const maxBufSize = (opts === null || opts === void 0 ? void 0 : opts.bufferSize) || 8192;
        let filepath;
        let cleanup;
        let tmpFile;
        try {
            for (input_1 = tslib_1.__asyncValues(input); input_1_1 = yield input_1.next(), !input_1_1.done;) {
                const chunk = input_1_1.value;
                if (!tmpFile && buffers.length + chunk.length <= maxBufSize) {
                    buffers.push(chunk);
                    continue;
                }
                if (!tmpFile) {
                    ({ filepath, cleanup } = (0, util_1.tmpFilename)());
                    tmpFile = (0, node_fs_1.createWriteStream)(filepath);
                    tmpFile.write(Buffer.from(buffers));
                }
                const ok = tmpFile.write(chunk);
                if (!ok) {
                    yield new Promise(resolve => tmpFile === null || tmpFile === void 0 ? void 0 : tmpFile.on('drain', resolve));
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (input_1_1 && !input_1_1.done && (_a = input_1.return)) yield _a.call(input_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        yield hashpipe;
        const digest = 'SHA-256=' + hash.digest('base64').toString();
        let data;
        if (tmpFile && filepath && cleanup) {
            tmpFile.end();
            data = (0, node_fs_1.createReadStream)(filepath).on('close', cleanup);
        }
        else {
            data = node_stream_1.Readable.from(buffers);
        }
        return { data, digest };
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