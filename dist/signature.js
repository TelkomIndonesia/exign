"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sign = exports.digest = void 0;
var tslib_1 = require("tslib");
var crypto = tslib_1.__importStar(require("node:crypto"));
var httpSignature = tslib_1.__importStar(require("http-signature"));
var sshpk = tslib_1.__importStar(require("sshpk"));
var fs = tslib_1.__importStar(require("fs"));
var path = tslib_1.__importStar(require("path"));
var os = tslib_1.__importStar(require("os"));
var stream_1 = require("stream");
var node_util_1 = require("node:util");
var pipelineProm = (0, node_util_1.promisify)(stream_1.pipeline);
var uuid_1 = require("uuid");
function tmpFilename() {
    var filepath = path.join(os.tmpdir(), "etchpass-" + (0, uuid_1.v4)());
    var cleanup = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var err_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fs.promises.rm(filepath)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        console.log({ error: err_1, path: filepath, message: "error_deleting_tmp_file" });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return { filepath: filepath, cleanup: cleanup };
}
function digest(req, opts) {
    var req_1, req_1_1;
    var e_1, _a;
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var digest, body, _b, filepath, cleanup_1, buffers, chunk, e_1_1;
        var _c;
        return tslib_1.__generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    digest = new Promise(function (resolve, reject) {
                        var hash = crypto.createHash("sha256");
                        req.on("data", function (chunk) { return hash.update(chunk); }).
                            on("error", function (err) { return reject(err); }).
                            on("end", function () {
                            var digest = "SHA-256=".concat(hash.digest("base64").toString());
                            resolve(digest);
                        });
                    });
                    if (!((req.headers["content-length"] || 0) > ((opts === null || opts === void 0 ? void 0 : opts.maxBufferSize) || 8192))) return [3 /*break*/, 2];
                    _b = tmpFilename(), filepath = _b.filepath, cleanup_1 = _b.cleanup;
                    return [4 /*yield*/, pipelineProm(req, fs.createWriteStream(filepath))];
                case 1:
                    _d.sent();
                    body = fs.createReadStream(filepath).on("close", function () { return cleanup_1(); });
                    return [3 /*break*/, 15];
                case 2:
                    buffers = [];
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 8, 9, 14]);
                    req_1 = tslib_1.__asyncValues(req);
                    _d.label = 4;
                case 4: return [4 /*yield*/, req_1.next()];
                case 5:
                    if (!(req_1_1 = _d.sent(), !req_1_1.done)) return [3 /*break*/, 7];
                    chunk = req_1_1.value;
                    buffers.push(chunk);
                    _d.label = 6;
                case 6: return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 14];
                case 8:
                    e_1_1 = _d.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 14];
                case 9:
                    _d.trys.push([9, , 12, 13]);
                    if (!(req_1_1 && !req_1_1.done && (_a = req_1.return))) return [3 /*break*/, 11];
                    return [4 /*yield*/, _a.call(req_1)];
                case 10:
                    _d.sent();
                    _d.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 13: return [7 /*endfinally*/];
                case 14:
                    body = Buffer.concat(buffers).toString();
                    _d.label = 15;
                case 15:
                    _c = {};
                    return [4 /*yield*/, digest];
                case 16: return [2 /*return*/, (_c.digest = _d.sent(), _c.body = body, _c)];
            }
        });
    });
}
exports.digest = digest;
var hopByHopHeaders = new Map([
    ["keep-alive", true],
    ["transfer-encoding", true],
    ["te", true],
    ["connection", true],
    ["trailer", true],
    ["upgrade", true],
    ["proxy-authenticate", true],
    ["proxy-authorization", true],
]);
var signatureHeader = "signature";
function keyFingerprint(key) {
    try {
        return sshpk.parseKey(key).fingerprint('sha256').toString();
    }
    catch (_a) {
        return "";
    }
}
function sign(req, opts) {
    httpSignature.sign(req, {
        key: opts.key,
        keyId: opts.keyId || (opts.pubKey ? keyFingerprint(opts.pubKey) : ""),
        authorizationHeaderName: signatureHeader,
        headers: Object.keys(req.getHeaders()).
            concat("date", "(request-target)").
            filter(function (v) { return !hopByHopHeaders.get(v.toLowerCase()); }),
    });
}
exports.sign = sign;
//# sourceMappingURL=signature.js.map