"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newLogApp = void 0;
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const promises_1 = require("stream/promises");
const error_1 = require("./error");
const log_1 = require("./log");
function newLogApp(opts) {
    const app = (0, express_1.default)();
    const findHTTPMessage = (0, log_1.newHTTPMessageFinder)(opts.logdb);
    app.get('/messages/:id', (req, res) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const msg = yield findHTTPMessage({ id: req.params.id }, { decodeBody: req.query['decode-body'] === 'true' });
        if (!msg) {
            return res.status(404).send('not found');
        }
        res.setHeader('content-type', 'text/plain');
        yield (0, promises_1.pipeline)(msg, res);
        return res.end();
    }));
    app.use(error_1.errorMW);
    return app;
}
exports.newLogApp = newLogApp;
//# sourceMappingURL=log-app.js.map