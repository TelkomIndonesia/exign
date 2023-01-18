import { Application } from 'express';
interface mgmtAppOptions {
    signature: {
        key: string;
        pubkey: string;
    };
    transport: {
        caKey: string;
        caCert: string;
    };
    logdb: {
        directory: string;
    };
}
export declare function newMgmtApp(opts: mgmtAppOptions): Application;
export {};
