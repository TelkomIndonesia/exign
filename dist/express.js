"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var express_1 = tslib_1.__importDefault(require("express"));
var proxy_1 = require("./proxy");
var double_dash_domain_1 = require("./double-dash-domain");
var stream_1 = require("stream");
var signature_1 = require("./signature");
var config_1 = tslib_1.__importDefault(require("./config"));
var fs_1 = require("fs");
var app = (0, express_1.default)();
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
var key = (0, fs_1.readFileSync)(config_1.default.signature.keyfile, 'utf8');
var pubKey = (0, fs_1.readFileSync)(config_1.default.signature.pubkeyfile, 'utf8');
var proxy = (0, proxy_1.createProxyServer)({ ws: true }).
    on("proxyReq", function onProxyReq(proxyReq) {
    (0, signature_1.sign)(proxyReq, { key: key, pubKey: pubKey });
});
app.all("/*", function proxyHandler(req, res) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var _a, digestValue, body, targetHost;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, signature_1.digest)(req, { maxBufferSize: config_1.default.clientMaxBufferSize })];
                case 1:
                    _a = _b.sent(), digestValue = _a.digest, body = _a.body;
                    req.headers["digest"] = digestValue;
                    return [4 /*yield*/, (0, double_dash_domain_1.mapDoubleDashDomain)(req.hostname, config_1.default.doubleDashParentDomains)];
                case 2:
                    targetHost = (_b.sent()) || req.hostname;
                    proxy.web(req, res, {
                        changeOrigin: false,
                        target: "".concat(req.protocol, "://").concat(targetHost, ":").concat(req.protocol === "http" ? "80" : "443"),
                        secure: (process.env.MPROXY_FRONT_PROXY_SECURE || "true") === "true",
                        buffer: body instanceof stream_1.Readable ? body
                            : body ? stream_1.Readable.from(body)
                                : undefined
                    });
                    return [2 /*return*/];
            }
        });
    });
});
exports.default = app;
//# sourceMappingURL=express.js.map