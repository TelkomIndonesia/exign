import { Application } from 'express';
interface AppOptions {
    signature: {
        key: string;
        pubkey: string;
    };
    clientBodyBufferSize: number;
    upstreams: {
        doubleDashDomains: string[];
        hostmap: Map<string, string>;
        secure: boolean;
    };
    logdb: {
        directory: string;
    };
}
export declare function newApp(opts: AppOptions): Application;
export {};
