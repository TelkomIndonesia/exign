/// <reference types="@outtacontrol/socks" />
interface newSocks5ServerOptions {
    hostmap: Map<string, string>;
    target?: string;
}
export declare function newSocks5Server(opts?: newSocks5ServerOptions): import("@outtacontrol/socks").Server;
export {};
