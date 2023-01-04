"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newSocks5Server = void 0;
const socks_1 = require("@outtacontrol/socks");
const None_1 = require("@outtacontrol/socks/lib/auth/None");
function newSocks5Server(opts) {
    return (0, socks_1.createServer)(function (info, accept) {
        info.dstAddr = (opts === null || opts === void 0 ? void 0 : opts.hostmap.get(info.dstAddr)) ? '0.0.0.0' : info.dstAddr;
        accept();
    })
        .useAuth((0, None_1.None)());
}
exports.newSocks5Server = newSocks5Server;
//# sourceMappingURL=socks5.js.map