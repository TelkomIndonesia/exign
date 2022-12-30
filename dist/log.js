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
function newLogDB(date, opts) {
    return new level_1.Level((0, path_1.resolve)(opts.directory, dbName(date)), { valueEncoding: 'buffer' });
}
function headersToString(headers) {
    return Object.entries(headers)
        .reduce((str, [name, value]) => {
        return str + name + ': ' + (Array.isArray(value) ? value.join(',') : value + '\r\n');
    }, '');
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
                    chunk && db.put(`${id}-req-2-${pad(i++, 16)}`, chunk);
                    return fn.apply(req, [chunk, ...args]);
                };
            }; /* eslint-enable @typescript-eslint/no-explicit-any */
            req.write = wrapWriteEnd(req, req.write);
            req.end = wrapWriteEnd(req, req.end);
            db.batch()
                .put(`${id}-req-0`, Buffer.from(`${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion}`))
                .put(`${id}-req-1`, Buffer.from(headersToString(req.getHeaders())))
                .write();
            let j = 0;
            const res = yield new Promise((resolve, reject) => req
                .once('error', reject)
                .once('response', (res) => {
                res.on('data', (chunk) => db.put(`${id}-res-2-${pad(j++, 16)}`, chunk));
                resolve(res);
            }));
            db.batch()
                .put(`${id}-res-0`, Buffer.from(`HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}`))
                .put(`${id}-res-1`, Buffer.from(headersToString(res.headers)))
                .write();
            res.on('end', () => {
                res.trailers && db.put(`${id}-res-3`, Buffer.from(headersToString(res.trailers)));
            });
        });
    };
    fn.db = db;
    return fn;
}
exports.newHTTPMessageLogger = newHTTPMessageLogger;
function newHTTPMessageFinder(opts) {
    const dbs = new Map();
    const dbDates = (0, promises_1.readdir)(opts.directory, { withFileTypes: true })
        .then(entries => entries
        .filter(v => v.isDirectory())
        .reduce((arr, v) => {
        arr.push(new Date(Date.parse(v.name)));
        return arr;
    }, []));
    const fn = function findHTTPMessage(query) {
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
            const name = dbName(dbDate);
            let db = dbs.get(name);
            if (!db) {
                db = newLogDB(dbDate, opts);
                dbs.set(name, db);
            }
            const stream = new stream_1.PassThrough();
            let intermediate;
            try {
                for (var _b = tslib_1.__asyncValues(db.iterator({ gt: query.id, lt: query.id + '_' })), _c; _c = yield _b.next(), !_c.done;) {
                    const [key, value] = _c.value;
                    if (intermediate && (key.endsWith('-res-0') || key.endsWith('-res-3'))) {
                        yield new Promise((resolve, reject) => {
                            intermediate === null || intermediate === void 0 ? void 0 : intermediate.on('close', resolve).on('error', reject).end();
                        });
                        intermediate = undefined;
                        stream.write('\r\n');
                    }
                    const w = intermediate || stream;
                    const ok = w.write(value);
                    ok || (yield new Promise(resolve => stream.on('drain', resolve)));
                    intermediate || w.write('\r\n');
                    if (key.endsWith('-req-1') || key.endsWith('-res-1')) {
                        const enc = value.toString().split('\r\n').reduce((s, v) => {
                            const [name, value] = v.split(':', 2);
                            if (name.trim().toLowerCase() !== 'content-encoding') {
                                return s;
                            }
                            return value.trim().toLowerCase();
                        });
                        switch (enc) {
                            case 'gzip':
                                intermediate = (0, zlib_1.createGunzip)();
                                break;
                            case 'br':
                                intermediate = (0, zlib_1.createBrotliDecompress)();
                                break;
                            case 'deflate':
                                intermediate = (0, zlib_1.createInflate)();
                                break;
                        }
                        intermediate && intermediate.pipe(stream, { end: false });
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
    fn.dbs = dbs;
    return fn;
}
exports.newHTTPMessageFinder = newHTTPMessageFinder;
//# sourceMappingURL=log.js.map