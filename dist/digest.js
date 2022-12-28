"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restream = exports.digest = exports.formatHash = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const stream_1 = require("stream");
const promises_1 = require("stream/promises");
const util_1 = require("./util");
function formatHash(hash) {
    return 'SHA-256=' + hash.digest('base64').toString();
}
exports.formatHash = formatHash;
function digest(input) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const hash = (0, crypto_1.createHash)('sha256');
        yield (0, promises_1.pipeline)(input, hash);
        return formatHash(hash);
    });
}
exports.digest = digest;
function restream(input, opts) {
    var input_1, input_1_1;
    var e_1, _a;
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                    input.pause();
                    tmpFile = (0, fs_1.createWriteStream)(filepath);
                    tmpFile.write(Buffer.from(buffers));
                    input.resume();
                }
                const ok = tmpFile.write(chunk);
                if (!ok) {
                    yield new Promise(resolve => tmpFile === null || tmpFile === void 0 ? void 0 : tmpFile.once('drain', resolve));
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
        if (tmpFile && filepath && cleanup) {
            tmpFile.end();
            return (0, fs_1.createReadStream)(filepath).once('close', cleanup);
        }
        else {
            return stream_1.Readable.from(buffers, { objectMode: false });
        }
    });
}
exports.restream = restream;
//# sourceMappingURL=digest.js.map