"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProxyServer = void 0;
const http_proxy_1 = require("http-proxy");
// https://github.com/http-party/node-http-proxy/issues/1586#issue-1246337115
function withCleanup(proxy) {
    return proxy.on('proxyRes', (proxyRes, req, res) => {
        const cleanup = (err) => {
            // cleanup event listeners to allow clean garbage collection
            proxyRes.removeListener('error', cleanup);
            proxyRes.removeListener('close', cleanup);
            res.removeListener('error', cleanup);
            res.removeListener('close', cleanup);
            // destroy all source streams to propagate the caught event backward
            req.destroy(err);
            proxyRes.destroy(err);
        };
        proxyRes.once('error', cleanup);
        proxyRes.once('close', cleanup);
        res.once('error', cleanup);
        res.once('close', cleanup);
    });
}
function createProxyServer(opts) {
    return withCleanup((0, http_proxy_1.createProxyServer)(opts));
}
exports.createProxyServer = createProxyServer;
//# sourceMappingURL=proxy.js.map