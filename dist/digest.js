"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digest = exports.formatHash = exports.Restreamer = void 0;
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = require("path");
const stream_1 = require("stream");
const promises_2 = require("stream/promises");
const ulid_1 = require("ulid");
const generic_pool_1 = require("generic-pool");
const fileFactory = {
    create: async function create() {
        const name = (0, path_1.resolve)((0, os_1.tmpdir)(), 'exign-file-' + (0, ulid_1.ulid)());
        const handle = await (0, promises_1.open)(name, 'w+');
        const valid = true;
        return { name, valid, handle };
    },
    validate: async function validate(file) {
        return file.valid;
    },
    destroy: async function destroy(file) {
        await file.handle.close();
        (0, promises_1.rm)(file.name);
    }
};
class Restreamer {
    fileBufferPool;
    memBufferSize;
    constructor(opts) {
        this.fileBufferPool = (0, generic_pool_1.createPool)(fileFactory, {
            min: opts?.fileBufferPoolMin || 8,
            max: opts?.fileBufferPoolMax || 1024,
            testOnBorrow: true,
            evictionRunIntervalMillis: 60 * 1000
        });
        this.memBufferSize = opts?.memBufferSize || 8192;
    }
    async restream(input) {
        const buffers = [];
        let file;
        const fbPool = this.fileBufferPool;
        for await (const chunk of input) {
            if (!file && buffers.length + chunk.length <= this.memBufferSize) {
                buffers.push(chunk);
                continue;
            }
            if (!file) {
                file = await fbPool.acquire();
                await file.handle.write(Buffer.from(buffers));
            }
            await file.handle.write(chunk);
        }
        if (file) {
            const closer = async function closer() {
                if (!file)
                    return;
                await file.handle.truncate();
                fbPool.release(file);
            };
            return file.handle.createReadStream({ start: 0, autoClose: false })
                .once('end', closer)
                .once('error', closer)
                .once('close', () => { if (file)
                file.valid = false; });
        }
        return stream_1.Readable.from(buffers, { objectMode: false });
    }
    async close() {
        await this.fileBufferPool.drain();
        this.fileBufferPool.clear();
    }
}
exports.Restreamer = Restreamer;
function formatHash(hash) {
    return 'SHA-256=' + hash.digest('base64').toString();
}
exports.formatHash = formatHash;
async function digest(input) {
    const hash = (0, crypto_1.createHash)('sha256');
    await (0, promises_2.pipeline)(input, hash);
    return formatHash(hash);
}
exports.digest = digest;
//# sourceMappingURL=digest.js.map