/// <reference types="node" />
import { ClientRequest } from 'http';
interface newLogDBOptions {
    directory: string;
}
interface ClientRequestLine {
    url: string;
    httpVersion: string;
}
export declare function newHTTPMessageLogger(opts: newLogDBOptions): (req: ClientRequest, reqLine: ClientRequestLine) => Promise<void>;
export declare function consolelog(req: ClientRequest): void;
export {};
