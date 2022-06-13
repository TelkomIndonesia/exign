import { Application } from 'express';
interface AppOptions {
    signature: {
        keyfile: string;
        pubkeyfile: string;
    };
    clientMaxBufferSize: number;
    doubleDashParentDomains: string[];
}
declare function newApp(opts: AppOptions): Application;
export default newApp;
