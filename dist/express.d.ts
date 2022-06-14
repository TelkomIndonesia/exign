import { Application } from 'express';
interface AppOptions {
    signature: {
        keyfile: string;
        pubkeyfile: string;
    };
    clientBodyBufferSize: number;
    doubleDashParentDomains: string[];
}
declare function newApp(opts: AppOptions): Application;
export default newApp;
