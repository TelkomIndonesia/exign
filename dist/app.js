"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newApp = void 0;
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const signature_1 = require("./signature");
const double_dash_domain_1 = require("./double-dash-domain");
const proxy_1 = require("./proxy");
const http_1 = require("http");
const digest_1 = require("./digest");
const log_1 = require("./log");
const ulid_1 = require("ulid");
const https_1 = require("https");
require('express-async-errors');
function errorMW(err, _, res, next) {
    if (err) {
        console.log({ error: err });
        res.sendStatus(500);
    }
    next(err);
}
function newSignatureProxyHandler(opts) {
    const key = opts.signature.keyfile;
    const pubKey = opts.signature.pubkeyfile;
    const logMessage = (0, log_1.newHTTPMessageLogger)(opts.logdb);
    const proxy = (0, proxy_1.createProxyServer)({ ws: true })
        .on('proxyReq', function onProxyReq(proxyReq, req) {
        if (proxyReq.getHeader('content-length') === '0') {
            proxyReq.removeHeader('content-length'); // some reverse proxy drop 'content-length' when it is zero
        }
        proxyReq.setHeader('x-request-id', (0, ulid_1.ulid)());
        (0, log_1.consolelog)(proxyReq);
        logMessage(proxyReq, { url: req.url || '/', httpVersion: req.httpVersion });
        (0, signature_1.sign)(proxyReq, { key, pubKey });
    });
    const httpagent = new http_1.Agent({ keepAlive: true });
    const httpsagent = new https_1.Agent({ keepAlive: true });
    return function signatureProxyHandler(req, res, next) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const [digestValue, body] = yield Promise.all([
                (0, digest_1.digest)(req),
                (0, digest_1.restream)(req, { bufferSize: opts.clientBodyBufferSize })
            ]);
            res.once('close', () => body.destroy());
            const targetHost = opts.hostmap.get(req.hostname) ||
                (yield (0, double_dash_domain_1.mapDoubleDashHostname)(req.hostname, opts.doubleDashDomains)) ||
                req.hostname;
            proxy.web(req, res, {
                changeOrigin: false,
                target: `${req.protocol}://${targetHost}:${req.protocol === 'http' ? '80' : '443'}`,
                secure: opts.secure,
                buffer: body,
                headers: { digest: digestValue },
                agent: req.protocol === 'http' ? httpagent : httpsagent
            }, err => next(err));
        });
    };
}
function newApp(opts) {
    const app = (0, express_1.default)();
    app.all('/*', newSignatureProxyHandler(opts));
    app.use(errorMW);
    return app;
}
exports.newApp = newApp;
//# sourceMappingURL=app.js.map