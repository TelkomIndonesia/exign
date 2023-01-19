/// <reference types="node" />
/// <reference types="node" />
import { ClientRequest } from 'http';
import { PassThrough } from 'stream';
export declare const messageIDHeader = "x-exign-id";
export declare function attachID(req: ClientRequest): string;
export declare function consoleLog(req: ClientRequest): void;
interface LogDBOptions {
    directory: string;
}
interface ClientRequestLine {
    url: string;
    httpVersion: string;
}
interface LogDBFindQuery {
    id: string;
}
interface LogDBFindOptions {
    decodeBody?: boolean;
}
export declare class LogDB {
    private directory;
    private databases;
    constructor(opts: LogDBOptions);
    private getDB;
    log(req: ClientRequest, reqLine: ClientRequestLine): Promise<void>;
    find(query: LogDBFindQuery, fopts?: LogDBFindOptions): Promise<PassThrough | undefined>;
    close(): Promise<void>;
}
export {};
