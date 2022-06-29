import { Application } from 'express';
interface AppOptions {
    signature: {
        keyfile: string;
        pubkeyfile: string;
    };
    clientBodyBufferSize: number;
    doubleDashParentDomains: string[];
}
export declare function newApp(opts: AppOptions): Application;
export {};
