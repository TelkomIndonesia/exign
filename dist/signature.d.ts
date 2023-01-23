/// <reference types="node" />
import { ClientRequest, IncomingHttpHeaders, IncomingMessage } from 'node:http';
export declare const signatureHeader = "signature";
export declare const noVerifyHeaders: string[];
export declare function publicKeyFingerprint(key: string): string;
interface SignOptions {
    key: string;
    keyId?: string;
    pubkey?: string;
}
export declare function sign(req: ClientRequest, opts: SignOptions): void;
interface VerifiableMessage {
    method?: string;
    url?: string;
    httpVersion?: string;
    headers: IncomingHttpHeaders;
}
interface VerifyOptions {
    publicKeys: Map<string, string>;
}
export declare function verifyMessage(msg: VerifiableMessage, opts: VerifyOptions): {
    verified: boolean;
    error?: undefined;
} | {
    verified: boolean;
    error: unknown;
};
export declare function verify(res: IncomingMessage, opts: VerifyOptions): Promise<{
    verified: boolean;
    error?: undefined;
} | {
    verified: boolean;
    error: unknown;
}>;
export {};
