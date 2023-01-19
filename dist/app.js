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
const https_1 = require("https");
const error_1 = require("./error");
function newSignatureProxyHandler(opts) {
    const restreamer = new digest_1.Restreamer(opts.digest);
    process.on('exit', () => restreamer.close());
    const logDB = opts.logDB;
    const proxy = (0, proxy_1.createProxyServer)({ ws: true })
        .on('proxyReq', function onProxyReq(proxyReq, req, res) {
        if (proxyReq.getHeader('content-length') === '0') {
            proxyReq.removeHeader('content-length'); // some reverse proxy drop 'content-length' when it is zero
        }
        res.setHeader(log_1.messageIDHeader, (0, log_1.attachID)(proxyReq));
        (0, signature_1.sign)(proxyReq, opts.signature);
        (0, log_1.consoleLog)(proxyReq);
        logDB.log(proxyReq, { url: req.url || '/', httpVersion: req.httpVersion });
    })
        .on('proxyRes', (proxyRes, _, res) => {
        proxyRes.on('end', () => res.addTrailers(proxyRes.trailers));
    });
    const httpagent = new http_1.Agent({ keepAlive: true });
    const httpsagent = new https_1.Agent({ keepAlive: true });
    return function signatureProxyHandler(req, res, next) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const [digestValue, body] = yield Promise.all([(0, digest_1.digest)(req), restreamer.restream(req)]);
            const targetHost = opts.upstreams.hostmap.get(req.hostname) ||
                (yield (0, double_dash_domain_1.mapDoubleDashHostname)(req.hostname, opts.upstreams.doubleDashDomains)) ||
                req.hostname;
            proxy.web(req, res, {
                changeOrigin: false,
                target: `${req.protocol}://${targetHost}:${req.protocol === 'http' ? '80' : '443'}`,
                secure: opts.upstreams.secure,
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
    app.use(error_1.errorMW);
    return app;
}
exports.newApp = newApp;
//# sourceMappingURL=app.js.map