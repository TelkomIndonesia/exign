import { Application } from 'express';
import { LogDB } from './log';
interface mgmtAppOptions {
    signature: {
        key: string;
        pubkey: string;
    };
    transport: {
        caKey: string;
        caCert: string;
    };
    logDB: LogDB;
}
export declare function newMgmtApp(opts: mgmtAppOptions): Application;
export {};
