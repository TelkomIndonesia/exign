"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const proxy_1 = require("./proxy");
const double_dash_domain_1 = require("./double-dash-domain");
const stream_1 = require("stream");
const signature_1 = require("./signature");
const config_1 = tslib_1.__importDefault(require("./config"));
const fs_1 = require("fs");
const app = (0, express_1.default)();
app.use(function logger(req, res, next) {
    res.on("close", function log() {
        console.log({
            request: {
                method: req.method,
                url: req.originalUrl,
                headers: req.headers,
            },
            response: {
                status: res.statusCode,
                headers: res.getHeaders()
            }
        });
    });
    next();
});
const key = (0, fs_1.readFileSync)(config_1.default.signature.keyfile, 'utf8');
const pubKey = (0, fs_1.readFileSync)(config_1.default.signature.pubkeyfile, 'utf8');
const proxy = (0, proxy_1.createProxyServer)({ ws: true }).
    on("proxyReq", function onProxyReq(proxyReq) {
    (0, signature_1.sign)(proxyReq, { key: key, pubKey: pubKey });
});
app.all("/*", function proxyHandler(req, res) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { digest: digestValue, body } = yield (0, signature_1.digest)(req, { maxBufferSize: config_1.default.clientMaxBufferSize });
        req.headers["digest"] = digestValue;
        const targetHost = (yield (0, double_dash_domain_1.mapDoubleDashDomain)(req.hostname, config_1.default.doubleDashParentDomains)) || req.hostname;
        proxy.web(req, res, {
            changeOrigin: false,
            target: `${req.protocol}://${targetHost}:${req.protocol === "http" ? "80" : "443"}`,
            secure: (process.env.MPROXY_FRONT_PROXY_SECURE || "true") === "true",
            buffer: body instanceof stream_1.Readable ? body
                : body ? stream_1.Readable.from(body)
                    : undefined
        });
    });
});
exports.default = app;
//# sourceMappingURL=express.js.map