"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consolelog = exports.newHTTPMessageLogger = void 0;
const tslib_1 = require("tslib");
const level_1 = require("level");
const path_1 = require("path");
const signature_1 = require("./signature");
const logfmt_1 = tslib_1.__importDefault(require("logfmt"));
const flat_1 = require("flat");
function newLogDB(opts) {
    const now = new Date();
    const date = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return new level_1.Level((0, path_1.resolve)(opts.directory, date));
}
function headersToString(headers) {
    return Object.entries(headers)
        .reduce((str, [name, value]) => {
        return str + name + ': ' + (Array.isArray(value) ? value.join(',') : value + '\r\n');
    }, '') + '\r\n';
}
function newHTTPMessageLogger(opts) {
    const db = newLogDB(opts);
    return function logHTTPMessage(req, reqLine) {
        var e_1, _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const id = req.getHeader('x-request-id');
            if (!id) {
                return;
            }
            const pad = function pad(n) { return n.toString().padStart(16, '0'); };
            db.batch()
                .put(`${id}-req-0-start-line`, `${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion}`)
                .put(`${id}-req-1-headers`, headersToString(req.getHeaders()))
                .write();
            /* eslint-disable  @typescript-eslint/no-explicit-any */
            let i = 0;
            const wrapWriteEnd = function wrapWriteEnd(req, fn) {
                return function wrapped(chunk, ...args) {
                    chunk && db.put(`${id}-req-2-data-${pad(i++)}`, chunk);
                    return fn.apply(req, [chunk, ...args]);
                };
            }; /* eslint-enable  @typescript-eslint/no-explicit-any */
            req.write = wrapWriteEnd(req, req.write);
            req.end = wrapWriteEnd(req, req.end);
            const res = yield new Promise((resolve, reject) => req.once('response', resolve).once('error', reject));
            db.batch()
                .put(`${id}-res-0-status-line`, `HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}\r\n`)
                .put(`${id}-res-1-headers`, headersToString(res.headers))
                .write();
            let j = 0;
            try {
                for (var res_1 = tslib_1.__asyncValues(res), res_1_1; res_1_1 = yield res_1.next(), !res_1_1.done;) {
                    const chunk = res_1_1.value;
                    db.put(`${id}-res-2-data-${pad(j++)}`, chunk);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (res_1_1 && !res_1_1.done && (_a = res_1.return)) yield _a.call(res_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (res.trailers) {
                db.put(`${id}-res-3-trailers`, headersToString(res.trailers));
            }
        });
    };
}
exports.newHTTPMessageLogger = newHTTPMessageLogger;
function consolelog(req) {
    req.on('response', (res) => {
        res.on('close', function log() {
            const obj = {
                request: {
                    method: req.method,
                    url: `${req.protocol}//${req.host}${req.path}`,
                    headers: {
                        'x-request-id': req.getHeader('x-request-id'),
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
exports.consolelog = consolelog;
//# sourceMappingURL=log.js.map