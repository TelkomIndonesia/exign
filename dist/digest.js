"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digest = exports.formatHash = exports.Restreamer = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = require("path");
const stream_1 = require("stream");
const promises_2 = require("stream/promises");
const ulid_1 = require("ulid");
const generic_pool_1 = require("generic-pool");
const fileFactory = {
    create: function create() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const name = (0, path_1.resolve)((0, os_1.tmpdir)(), 'exign-file-' + (0, ulid_1.ulid)());
            const handle = yield (0, promises_1.open)(name, 'w+');
            const valid = true;
            return { name, valid, handle };
        });
    },
    validate: function validate(file) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return file.valid;
        });
    },
    destroy: function destroy(file) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield file.handle.close();
            (0, promises_1.rm)(file.name);
        });
    }
};
class Restreamer {
    constructor(opts) {
        this.fileBufferPool = (0, generic_pool_1.createPool)(fileFactory, {
            min: (opts === null || opts === void 0 ? void 0 : opts.fileBufferPoolMin) || 8,
            max: (opts === null || opts === void 0 ? void 0 : opts.fileBufferPoolMax) || 1024,
            testOnBorrow: true,
            evictionRunIntervalMillis: 60 * 1000
        });
        this.memBufferSize = (opts === null || opts === void 0 ? void 0 : opts.memBufferSize) || 8192;
    }
    restream(input) {
        var _a, input_1, input_1_1;
        var _b, e_1, _c, _d;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const buffers = [];
            let file;
            const fbPool = this.fileBufferPool;
            try {
                for (_a = true, input_1 = tslib_1.__asyncValues(input); input_1_1 = yield input_1.next(), _b = input_1_1.done, !_b;) {
                    _d = input_1_1.value;
                    _a = false;
                    try {
                        const chunk = _d;
                        if (!file && buffers.length + chunk.length <= this.memBufferSize) {
                            buffers.push(chunk);
                            continue;
                        }
                        if (!file) {
                            file = yield fbPool.acquire();
                            yield file.handle.write(Buffer.from(buffers));
                        }
                        yield file.handle.write(chunk);
                    }
                    finally {
                        _a = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_a && !_b && (_c = input_1.return)) yield _c.call(input_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (file) {
                const closer = function closer() {
                    return tslib_1.__awaiter(this, void 0, void 0, function* () {
                        if (!file)
                            return;
                        yield file.handle.truncate();
                        fbPool.release(file);
                    });
                };
                return file.handle.createReadStream({ start: 0, autoClose: false })
                    .once('end', closer)
                    .once('error', closer)
                    .once('close', () => { if (file)
                    file.valid = false; });
            }
            return stream_1.Readable.from(buffers, { objectMode: false });
        });
    }
    close() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.fileBufferPool.drain();
            this.fileBufferPool.clear();
        });
    }
}
exports.Restreamer = Restreamer;
function formatHash(hash) {
    return 'SHA-256=' + hash.digest('base64').toString();
}
exports.formatHash = formatHash;
function digest(input) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const hash = (0, crypto_1.createHash)('sha256');
        yield (0, promises_2.pipeline)(input, hash);
        return formatHash(hash);
    });
}
exports.digest = digest;
//# sourceMappingURL=digest.js.map