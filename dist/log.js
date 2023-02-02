"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogDB = exports.consoleLog = exports.attachID = exports.messageIDHeader = void 0;
const tslib_1 = require("tslib");
const level_1 = require("level");
const path_1 = require("path");
const signature_1 = require("./signature");
const logfmt_1 = tslib_1.__importDefault(require("logfmt"));
const flat_1 = require("flat");
const ulid_1 = require("ulid");
const stream_1 = require("stream");
const zlib_1 = require("zlib");
exports.messageIDHeader = 'x-exign-id';
const idSeparator = '-';
function attachID(req, postfix) {
    const id = (0, ulid_1.ulid)() + (postfix ? idSeparator + postfix : '');
    req.setHeader(exports.messageIDHeader, id);
    return id;
}
exports.attachID = attachID;
function consoleLog(req) {
    req.on('response', (res) => {
        res.on('close', function log() {
            const obj = {
                request: {
                    http_version: res.httpVersion,
                    method: req.method,
                    url: `${req.protocol}//${req.host}${req.path}`,
                    headers: {
                        [exports.messageIDHeader]: req.getHeader(exports.messageIDHeader),
                        digest: req.getHeader('digest'),
                        [signature_1.signatureHeader]: req.getHeader(signature_1.signatureHeader)
                    }
                },
                response: {
                    status: res.statusCode,
                    headers: Object.keys(res.headers).length > 0 ? res.headers : undefined,
                    trailers: Object.keys(res.trailers).length > 0 ? res.trailers : undefined
                }
            };
            logfmt_1.default.log((0, flat_1.flatten)(obj, { maxDepth: 5 }));
        });
    });
}
exports.consoleLog = consoleLog;
function pad(n, length) {
    return n.toString().padStart(length, '0');
}
function headersToString(headers) {
    return Object.entries(headers)
        .reduce((str, [name, value]) => {
        return str + name + ': ' + (Array.isArray(value) ? value.join(',') : value + '\r\n');
    }, '') + '\r\n';
}
function logDBName(date) {
    date = date || new Date();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${date.getDate()}`;
}
class LogDB {
    directory;
    databases;
    constructor(opts) {
        this.directory = opts.directory;
        this.databases = new Map();
    }
    async getDB(date, opts) {
        const name = logDBName(date);
        let db = this.databases.get(name);
        if (!db) {
            try {
                db = new level_1.Level((0, path_1.resolve)(this.directory, name), { ...opts, valueEncoding: 'buffer' });
                this.databases.set(name, db);
                await db.open();
            }
            catch (err) {
                console.error('[ERROR] failed opening level DB: ', err);
                this.databases.delete(name);
                return;
            }
        }
        return db;
    }
    async log(req, reqLine) {
        const id = req.getHeader(exports.messageIDHeader);
        if (!id) {
            return;
        }
        const db = await this.getDB();
        if (!db) {
            throw new Error('[FATAL] Can not open LogDB');
        }
        /* eslint-disable @typescript-eslint/no-explicit-any */
        let i = 0;
        const wrapWriteEnd = function wrapWriteEnd(req, fn) {
            return function wrapped(chunk, ...args) {
                chunk && db.put(`${id}-req-1-${pad(i++, 16)}`, chunk);
                return fn.apply(req, [chunk, ...args]);
            };
        }; /* eslint-enable @typescript-eslint/no-explicit-any */
        req.write = wrapWriteEnd(req, req.write);
        req.end = wrapWriteEnd(req, req.end);
        req.on('finish', () => db.put(`${id}-req-2`, Buffer.from('\r\n'))); // reserved for req trailers
        db.put(`${id}-req-0`, Buffer.from(`${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion || '1.1'}\r\n` +
            headersToString(req.getHeaders())));
        let j = 0;
        const res = await new Promise((resolve, reject) => req
            .once('error', reject)
            .once('response', (res) => {
            res.on('data', (chunk) => db.put(`${id}-res-1-${pad(j++, 16)}`, chunk));
            resolve(res);
        }));
        db.put(`${id}-res-0`, Buffer.from(`HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}\r\n` +
            headersToString(res.headers)));
        res.on('end', () => {
            res.trailers && db.put(`${id}-res-2`, Buffer.from(headersToString(res.trailers)));
        });
    }
    async find(query, fopts) {
        const date = new Date((0, ulid_1.decodeTime)(query.id.substring(0, query.id.indexOf(idSeparator))));
        const db = await this.getDB(date, { createIfMissing: false });
        if (!db) {
            return;
        }
        const filter = { gt: query.id, lt: query.id + '_' };
        const keys = await db.keys({ ...filter, limit: 1 }).all();
        if (!keys || keys.length < 1) {
            return;
        }
        const stream = new stream_1.PassThrough();
        const pipeLog = async function pipeLog() {
            let decoder;
            for await (const [key, value] of db.iterator(filter)) {
                if (key.endsWith('-req-2') || key.endsWith('-res-2')) {
                    if (decoder) {
                        await new Promise((resolve, reject) => decoder?.on('close', resolve).on('error', reject).end());
                        decoder = undefined;
                    }
                    stream.write('\r\n'); // add newline after body
                }
                const w = decoder || stream;
                w.write(value) || await new Promise(resolve => stream.on('drain', resolve));
                if (fopts?.decodeBody && key.endsWith('-0')) {
                    const enc = value.toString().split('\r\n').reduce((s, v) => {
                        const [name, value] = v.split(':', 2);
                        if (name.trim().toLowerCase() !== 'content-encoding') {
                            return s;
                        }
                        return value.trim().toLowerCase();
                    });
                    switch (enc) {
                        case 'gzip':
                            decoder = (0, zlib_1.createGunzip)();
                            break;
                        case 'br':
                            decoder = (0, zlib_1.createBrotliDecompress)();
                            break;
                        case 'deflate':
                            decoder = (0, zlib_1.createInflate)();
                            break;
                    }
                    decoder && decoder.pipe(stream, { end: false });
                    stream.on('error', () => decoder?.destroy());
                }
            }
            stream.end();
        };
        setImmediate(async () => {
            try {
                await pipeLog();
            }
            catch (err) {
                console.error('[ERROR] fail to pipe log from db: ', err);
            }
        });
        return stream;
    }
    async close() {
        for (const db of this.databases.values()) {
            await db.close();
        }
        this.databases.clear();
    }
}
exports.LogDB = LogDB;
//# sourceMappingURL=log.js.map