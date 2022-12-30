/// <reference types="node" />
/// <reference types="node" />
import { ClientRequest } from 'http';
import { Level } from 'level';
import { PassThrough } from 'stream';
export declare const requestIDHeader = "x-request-id";
export declare function attachID(req: ClientRequest): ClientRequest;
export declare function consoleLog(req: ClientRequest): void;
interface newLogDBOptions {
    directory: string;
}
interface ClientRequestLine {
    url: string;
    httpVersion: string;
}
export declare function newHTTPMessageLogger(opts: newLogDBOptions): {
    (req: ClientRequest, reqLine: ClientRequestLine): Promise<void>;
    db: Level<string, string>;
};
interface httpMessageQuery {
    id: string;
}
export declare function newHTTPMessageFinder(opts: newLogDBOptions): {
    (query: httpMessageQuery): Promise<PassThrough | undefined>;
    dbs: Map<string, Level<string, string>>;
};
export {};
