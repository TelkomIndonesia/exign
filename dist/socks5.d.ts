/// <reference types="@outtacontrol/socks" />
interface newSocks5ServerOptions {
    hostmap: Map<string, string>;
    dstAddrOverride?: string;
}
export declare function newSocks5Server(opts?: newSocks5ServerOptions): import("@outtacontrol/socks").Server;
export {};
