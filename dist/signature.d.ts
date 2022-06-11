/// <reference types="node" />
/// <reference types="node" />
import { ClientRequest, IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
interface digestOptions {
    maxBufferSize?: number;
}
export declare function digest(req: IncomingMessage, opts?: digestOptions): Promise<{
    digest: string;
    body: string | Readable;
}>;
export declare const noVerifyHeaders: string[];
interface signOptions {
    key: string;
    keyId?: string;
    pubKey?: string;
}
export declare function sign(req: ClientRequest, opts: signOptions): void;
export {};
