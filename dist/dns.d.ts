interface options {
    hostsOverride: string[];
    target: string;
    port?: number;
    server?: string;
}
export declare function newDNSOverrideServer(opts: options): {
    listen: (port: number, cb?: () => void) => void;
    close: (cb: (...args: unknown[]) => void) => any;
};
export {};
