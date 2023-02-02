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
const cacheable = import('cacheable-lookup').then(pkg => pkg.default).then(CacheableLookup => new CacheableLookup());
function withCacheableLookup(agent) {
    cacheable.then(cacheable => cacheable.install(agent));
    return agent;
}
const stopPeriodMilis = 10 * 1000;
function formatStopMessage(messageID) {
    return `Invalid response signature was detected from request(s): '${Array.isArray(messageID) ? messageID.join("', '") : messageID}'. ` +
        `The proxy will stop receiving request for ${stopPeriodMilis.toLocaleString()} milisecond. ` +
        'Contact the remote administrator for confirmation.';
}
function newSignatureProxyHandler(opts) {
    const restreamer = new digest_1.Restreamer(opts.digest);
    process.on('exit', () => restreamer.close());
    const httpagent = withCacheableLookup(new http_1.Agent({ keepAlive: true }));
    const httpsagent = withCacheableLookup(new https_1.Agent({ keepAlive: true }));
    const logDB = opts.logDB;
    const stop = new Map();
    let msgIDPostfix = Date.now().toString();
    const proxy = (0, proxy_1.createProxyServer)({ ws: true })
        .on('proxyReq', function onProxyReq(proxyReq, req, res) {
        if (proxyReq.getHeader('content-length') === '0') {
            proxyReq.removeHeader('content-length'); // some reverse proxy drop 'content-length' when it is zero
        }
        res.setHeader(log_1.messageIDHeader, (0, log_1.attachID)(proxyReq, msgIDPostfix));
        (0, signature_1.sign)(proxyReq, opts.signature);
        (0, log_1.consoleLog)(proxyReq);
        logDB.log(proxyReq, { url: req.url || '/', httpVersion: req.httpVersion });
    })
        .on('proxyRes', function onProxyRes(proxyRes, req, res) {
        var _a;
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            res.addTrailers(proxyRes.trailers);
            if (!opts.verification) {
                return;
            }
            const { verified } = yield (0, signature_1.verify)(proxyRes, { publicKeys: opts.verification.keys });
            if (!verified) {
                const host = req.headers.host || '';
                const id = ((_a = res.getHeader(log_1.messageIDHeader)) === null || _a === void 0 ? void 0 : _a.toString()) || '';
                console.log('[ERROR] ', formatStopMessage(id));
                const stoppers = stop.get(host);
                if (!stoppers) {
                    stop.set(host, [id]);
                    msgIDPostfix = Date.now().toString();
                    setTimeout(() => stop.delete(host), stopPeriodMilis);
                }
                else {
                    stoppers.push(id);
                }
            }
        });
    });
    return function signatureProxyHandler(req, res, next) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const stopID = stop.get(req.hostname);
            if (stopID) {
                res.status(503).send(formatStopMessage(stopID));
                return;
            }
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
                agent: req.protocol === 'http' ? yield httpagent : yield httpsagent
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