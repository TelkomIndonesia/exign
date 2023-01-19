import { Application } from 'express';
import { LogDB } from './log';
interface AppOptions {
    signature: {
        key: string;
        pubkey: string;
    };
    digest: {
        memBufferSize: number;
        fileBufferPoolMin: number;
        fileBufferPoolMax: number;
    };
    upstreams: {
        doubleDashDomains: string[];
        hostmap: Map<string, string>;
        secure: boolean;
    };
    logDB: LogDB;
}
export declare function newApp(opts: AppOptions): Application;
export {};
