interface options {
    hosts: string[];
    address: string;
    port?: number;
    resolver?: string;
}
export declare function newDNSOverrideServer(opts: options): {
    listen: (port: number, cb?: () => void) => void;
    close: (cb: (...args: unknown[]) => void) => any;
};
export {};
