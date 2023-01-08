"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newDNSOverrideServer = void 0;
const tslib_1 = require("tslib");
const dnsjack_1 = tslib_1.__importDefault(require("dnsjack"));
function newDNSOverrideServer(opts) {
    const server = dnsjack_1.default.createServer(opts.resolver)
        .route(opts.hosts, opts.address)
        .on('error', (err) => console.error(`[WARN] DNS resolve error: ${err}`));
    return {
        listen: (port, cb) => {
            server.listen(port);
            cb && cb();
        },
        close: (cb) => server.close(cb)
    };
}
exports.newDNSOverrideServer = newDNSOverrideServer;
//# sourceMappingURL=dns.js.map