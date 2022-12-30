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
    return new level_1.Level((0, path_1.resolve)(opts.directory, dbName(date)));
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
        var e_1, _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const id = req.getHeader(exports.requestIDHeader);
            if (!id) {
                return;
            }
            db.batch()
                .put(`${id}-req-0`, `${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion}`)
                .put(`${id}-req-1`, headersToString(req.getHeaders()))
                .write();
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
            const res = yield new Promise((resolve, reject) => req.once('response', resolve).once('error', reject));
            db.batch()
                .put(`${id}-res-0`, `HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}`)
                .put(`${id}-res-1`, headersToString(res.headers))
                .write();
            let j = 0;
            try {
                for (var res_1 = tslib_1.__asyncValues(res), res_1_1; res_1_1 = yield res_1.next(), !res_1_1.done;) {
                    const chunk = res_1_1.value;
                    db.put(`${id}-res-2-${pad(j++, 16)}`, chunk);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (res_1_1 && !res_1_1.done && (_a = res_1.return)) yield _a.call(res_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            res.trailers && db.put(`${id}-res-3`, headersToString(res.trailers));
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
        var e_2, _a;
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
            try {
                for (var _b = tslib_1.__asyncValues(db.iterator({ gt: query.id, lt: query.id + '_' })), _c; _c = yield _b.next(), !_c.done;) {
                    const [, value] = _c.value;
                    const ok = stream.write(value);
                    if (!ok) {
                        yield new Promise(resolve => stream.on('drain', resolve));
                    }
                    stream.write('\r\n');
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
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