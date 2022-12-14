"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newApp = void 0;
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const express_1 = tslib_1.__importDefault(require("express"));
const signature_1 = require("./signature");
const double_dash_domain_1 = require("./double-dash-domain");
const proxy_1 = require("./proxy");
require('express-async-errors');
function errorMW(err, _, res, next) {
    if (err) {
        console.log({ error: err });
        res.sendStatus(500);
    }
    next(err);
}
function log(req, res) {
    res.on('close', function log() {
        console.log({
            request: {
                method: req.method,
                url: `${req.protocol}//${req.host}${req.path}`,
                headers: req.getHeaders()
            },
            response: {
                status: res.statusCode,
                headers: res.getHeaders()
            }
        });
    });
}
function newSignatureHandler(opts) {
    const key = (0, fs_1.readFileSync)(opts.signature.keyfile, 'utf8');
    const pubKey = (0, fs_1.readFileSync)(opts.signature.pubkeyfile, 'utf8');
    const proxy = (0, proxy_1.createProxyServer)({ ws: true })
        .on('proxyReq', function onProxyReq(proxyReq, _, res) {
        log(proxyReq, res);
        (0, signature_1.sign)(proxyReq, { key, pubKey });
    });
    return function signatureHandler(req, res, next) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const { digest: digestValue, data } = yield (0, signature_1.digest)(req, { bufferSize: opts.clientBodyBufferSize });
            res.once('close', () => data.destroy());
            const targetHost = opts.hostmap.get(req.hostname) ||
                (yield (0, double_dash_domain_1.mapDoubleDashHostname)(req.hostname, opts.doubleDashDomains)) || req.hostname;
            proxy.web(req, res, {
                changeOrigin: false,
                target: `${req.protocol}://${targetHost}:${req.protocol === 'http' ? '80' : '443'}`,
                secure: opts.secure,
                buffer: data,
                headers: { digest: digestValue }
            }, err => next(err));
        });
    };
}
function newApp(opts) {
    const app = (0, express_1.default)();
    app.all('/*', newSignatureHandler(opts));
    app.use(errorMW);
    return app;
}
exports.newApp = newApp;
//# sourceMappingURL=app.js.map