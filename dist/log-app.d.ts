import { Application } from 'express';
interface appLogOptions {
    logdb: {
        directory: string;
    };
}
export declare function newLogApp(opts: appLogOptions): Application;
export {};
