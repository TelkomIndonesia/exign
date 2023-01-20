/// <reference types="@outtacontrol/socks" />
interface newSocks5ServerOptions {
    target: string;
    hosts?: Map<string, unknown>;
    ports?: Map<number, unknown>;
}
export declare function newSocks5Server(opts: newSocks5ServerOptions): import("@outtacontrol/socks").Server;
export {};
