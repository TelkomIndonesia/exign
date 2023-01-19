"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newMgmtApp = void 0;
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const promises_1 = require("stream/promises");
const error_1 = require("./error");
function newMgmtApp(opts) {
    const app = (0, express_1.default)();
    app.get('/messages/:id', (req, res) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const msg = yield opts.logDB.find({ id: req.params.id }, { decodeBody: req.query['decode-body'] === 'true' });
        if (!msg) {
            return res.status(404).send('not found');
        }
        res.setHeader('content-type', 'text/plain');
        yield (0, promises_1.pipeline)(msg, res);
        return res.end();
    }));
    app
        .get('/config/signature/key.pem', (_, res) => {
        return res
            .setHeader('content-type', 'text/plain')
            .send(opts.signature.key);
    })
        .get('/config/signature/pubkey.pem', (req, res) => {
        return res
            .setHeader('content-type', 'text/plain')
            .setHeader('content-disposition', req.query.dl !== undefined ? 'attachment; filename="pubkey.pem"' : 'inline')
            .send(opts.signature.pubkey);
    })
        .get('/config/transport/ca-key.pem', (_, res) => {
        return res
            .setHeader('content-type', 'text/plain')
            .send(opts.transport.caKey);
    })
        .get('/config/transport/ca.crt', (req, res) => {
        return res
            .setHeader('content-type', 'text/plain')
            .setHeader('content-disposition', req.query.dl !== undefined ? 'attachment; filename="ca.crt"' : 'inline')
            .send(opts.transport.caCert);
    });
    app.use(error_1.errorMW);
    return app;
}
exports.newMgmtApp = newMgmtApp;
//# sourceMappingURL=mgmt-app.js.map