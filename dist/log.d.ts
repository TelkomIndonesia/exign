/// <reference types="node" />
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
    db: Level<string, Buffer>;
};
interface httpMessageQuery {
    id: string;
}
interface httpMesageFindOptions {
    decodeBody?: boolean;
}
export declare function newHTTPMessageFinder(opts: newLogDBOptions): {
    (query: httpMessageQuery, fopts?: httpMesageFindOptions): Promise<PassThrough | undefined>;
    dbs: Map<string, Level<string, Buffer>>;
};
export {};
