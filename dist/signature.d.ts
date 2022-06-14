/// <reference types="node" />
/// <reference types="node" />
import { ClientRequest, IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
interface DigestOptions {
    bufferSize?: number;
}
export declare function digest(req: IncomingMessage, opts?: DigestOptions): Promise<{
    digest: string;
    body: string | Readable;
}>;
export declare const noVerifyHeaders: string[];
interface SignOptions {
    key: string;
    keyId?: string;
    pubKey?: string;
}
export declare function sign(req: ClientRequest, opts: SignOptions): void;
export {};
