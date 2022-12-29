"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newResponseLogger = void 0;
const tslib_1 = require("tslib");
const level_1 = require("level");
const path_1 = require("path");
function newLogDB(opts) {
    const now = new Date();
    const subdirname = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
    return new level_1.Level((0, path_1.resolve)(opts.directory, subdirname));
}
function headersToString(headers) {
    return Object.entries(headers)
        .reduce((str, [name, value]) => {
        str += name + ': ' + (Array.isArray(value) ? value.join(',') : value + '\r\n');
        return str;
    }, '') + '\r\n';
}
function newResponseLogger(opts) {
    const db = newLogDB(opts);
    return function logResponse(res) {
        var res_1, res_1_1;
        var e_1, _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const id = res.headers['x-request-id'];
            if (!id) {
                return;
            }
            db.batch()
                .put(`${id}-0-status-line`, `HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}\r\n`)
                .put(`${id}-1-headers`, headersToString(res.headers))
                .write();
            let i = 0;
            try {
                for (res_1 = tslib_1.__asyncValues(res); res_1_1 = yield res_1.next(), !res_1_1.done;) {
                    const chunk = res_1_1.value;
                    db.put(`${id}-2-data-${i++}`, chunk);
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
                db.put(`${id}-3-trailers`, headersToString(res.trailers));
            }
        });
    };
}
exports.newResponseLogger = newResponseLogger;
//# sourceMappingURL=log.js.map