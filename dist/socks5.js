"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newSocks5Server = void 0;
const socks_1 = require("@outtacontrol/socks");
const None_1 = require("@outtacontrol/socks/lib/auth/None");
function newSocks5Server(opts) {
    return (0, socks_1.createServer)(function (info, accept) {
        if (opts.hosts && opts.hosts.size > 0) {
            info.dstAddr = opts.hosts.get(info.dstAddr)
                ? opts.target
                : info.dstAddr;
        }
        else {
            info.dstAddr = opts.target;
        }
        accept();
    })
        .useAuth((0, None_1.None)());
}
exports.newSocks5Server = newSocks5Server;
//# sourceMappingURL=socks5.js.map