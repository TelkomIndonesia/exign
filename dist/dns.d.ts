interface options {
    address: string;
    hosts?: string[];
    port?: number;
    resolver?: string;
}
export declare function newDNSOverrideServer(opts: options): {
    listen: (port: number, cb?: () => void) => void;
    close: (cb: (...args: unknown[]) => void) => any;
};
export {};
