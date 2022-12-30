"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newHTTPMessageFinder = exports.newHTTPMessageLogger = exports.consoleLog = exports.attachID = exports.requestIDHeader = void 0;
const tslib_1 = require("tslib");
const level_1 = require("level");
const path_1 = require("path");
const signature_1 = require("./signature");
const logfmt_1 = tslib_1.__importDefault(require("logfmt"));
const flat_1 = require("flat");
const ulid_1 = require("ulid");
const promises_1 = require("fs/promises");
const stream_1 = require("stream");
const zlib_1 = require("zlib");
exports.requestIDHeader = 'x-request-id';
function attachID(req) {
    req.setHeader(exports.requestIDHeader, (0, ulid_1.ulid)());
    return req;
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
                        requestIDHeader: req.getHeader('x-request-id'),
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
function dbName(date) {
    date = date || new Date();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${date.getDate()}`;
}
const databases = new Map();
function newLogDB(date, opts) {
    const name = dbName(date);
    let db = databases.get(name);
    if (!db) {
        db = new level_1.Level((0, path_1.resolve)(opts.directory, name), { valueEncoding: 'buffer' });
        databases.set(name, db);
    }
    return db;
}
function headersToString(headers) {
    return Object.entries(headers)
        .reduce((str, [name, value]) => {
        return str + name + ': ' + (Array.isArray(value) ? value.join(',') : value + '\r\n');
    }, '') + '\r\n';
}
function newHTTPMessageLogger(opts) {
    const db = newLogDB(new Date(), opts);
    const fn = function logHTTPMessage(req, reqLine) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const id = req.getHeader(exports.requestIDHeader);
            if (!id) {
                return;
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
            db.put(`${id}-req-0`, Buffer.from(`${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion}\r\n` +
                headersToString(req.getHeaders())));
            let j = 0;
            const res = yield new Promise((resolve, reject) => req
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
        });
    };
    fn.db = db;
    return fn;
}
exports.newHTTPMessageLogger = newHTTPMessageLogger;
function newHTTPMessageFinder(opts) {
    const dbDates = (0, promises_1.readdir)(opts.directory, { withFileTypes: true })
        .then(entries => entries
        .reduce((arr, v) => {
        if (!v.isDirectory()) {
            return arr;
        }
        arr.push(new Date(Date.parse(v.name)));
        return arr;
    }, []));
    const fn = function findHTTPMessage(query, fopts) {
        var e_1, _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const date = new Date((0, ulid_1.decodeTime)(query.id));
            let dbDate;
            for (const d of yield dbDates) {
                if (dbDate && d.getTime() < dbDate.getTime()) {
                    continue;
                }
                if (d.getTime() > date.getTime()) {
                    continue;
                }
                dbDate = d;
            }
            if (!dbDate) {
                return;
            }
            const db = newLogDB(dbDate, opts);
            const stream = new stream_1.PassThrough();
            let decoder;
            try {
                for (var _b = tslib_1.__asyncValues(db.iterator({ gt: query.id, lt: query.id + '_' })), _c; _c = yield _b.next(), !_c.done;) {
                    const [key, value] = _c.value;
                    if (key.endsWith('-req-2') || key.endsWith('-res-2')) {
                        if (decoder) {
                            yield new Promise((resolve, reject) => {
                                decoder === null || decoder === void 0 ? void 0 : decoder.on('close', resolve).on('error', reject).end();
                            });
                            decoder = undefined;
                        }
                        stream.write('\r\n'); // add newline after body
                    }
                    const w = decoder || stream;
                    w.write(value) || (yield new Promise(resolve => stream.on('drain', resolve)));
                    if ((fopts === null || fopts === void 0 ? void 0 : fopts.decodeBody) && key.endsWith('-0')) {
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
                        stream.on('error', () => decoder === null || decoder === void 0 ? void 0 : decoder.destroy());
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            stream.end();
            return stream;
        });
    };
    fn.dbs = databases;
    return fn;
}
exports.newHTTPMessageFinder = newHTTPMessageFinder;
//# sourceMappingURL=log.js.map