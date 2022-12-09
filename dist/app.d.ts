import { Application } from 'express';
interface AppOptions {
    signature: {
        keyfile: string;
        pubkeyfile: string;
    };
    clientBodyBufferSize: number;
    doubleDashDomains: string[];
    hostmap: Map<string, string>;
    secure: boolean;
}
export declare function newApp(opts: AppOptions): Application;
export {};
