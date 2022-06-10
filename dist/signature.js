"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sign = exports.digest = void 0;
const tslib_1 = require("tslib");
const crypto = tslib_1.__importStar(require("node:crypto"));
const httpSignature = tslib_1.__importStar(require("http-signature"));
const sshpk = tslib_1.__importStar(require("sshpk"));
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
const os = tslib_1.__importStar(require("os"));
const stream_1 = require("stream");
const node_util_1 = require("node:util");
const pipelineProm = (0, node_util_1.promisify)(stream_1.pipeline);
const uuid_1 = require("uuid");
function tmpFilename() {
    const filepath = path.join(os.tmpdir(), "etchpass-" + (0, uuid_1.v4)());
    const cleanup = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.promises.rm(filepath);
            }
            catch (err) {
                console.log({ error: err, path: filepath, message: "error_deleting_tmp_file" });
            }
        });
    };
    return { filepath, cleanup };
}
function digest(req, opts) {
    var req_1, req_1_1;
    var e_1, _a;
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const digest = new Promise((resolve, reject) => {
            const hash = crypto.createHash("sha256");
            req.on("data", chunk => hash.update(chunk)).
                on("error", err => reject(err)).
                on("end", () => {
                const digest = `SHA-256=${hash.digest("base64").toString()}`;
                resolve(digest);
            });
        });
        let body;
        if ((req.headers["content-length"] || 0) > ((opts === null || opts === void 0 ? void 0 : opts.maxBufferSize) || 8192)) {
            const { filepath, cleanup } = tmpFilename();
            yield pipelineProm(req, fs.createWriteStream(filepath));
            body = fs.createReadStream(filepath).on("close", () => cleanup());
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
    ["keep-alive", true],
    ["transfer-encoding", true],
    ["te", true],
    ["connection", true],
    ["trailer", true],
    ["upgrade", true],
    ["proxy-authenticate", true],
    ["proxy-authorization", true],
]);
const signatureHeader = "signature";
function keyFingerprint(key) {
    try {
        return sshpk.parseKey(key).fingerprint('sha256').toString();
    }
    catch (_a) {
        return "";
    }
}
function sign(req, opts) {
    const addParam = ["(request-target)"];
    if (!req.hasHeader("date"))
        addParam.push("date"); // the header will be added by the library
    httpSignature.sign(req, {
        key: opts.key,
        keyId: opts.keyId || (opts.pubKey ? keyFingerprint(opts.pubKey) : ""),
        authorizationHeaderName: signatureHeader,
        headers: Object.keys(req.getHeaders()).
            concat(addParam).
            filter(v => !hopByHopHeaders.get(v.toLowerCase())),
    });
}
exports.sign = sign;
//# sourceMappingURL=signature.js.map