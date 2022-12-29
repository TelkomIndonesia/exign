/// <reference types="node" />
/// <reference types="node" />
import { Hash } from 'crypto';
import { Readable } from 'stream';
export declare function formatHash(hash: Hash): string;
export declare function digest(input: Readable): Promise<string>;
interface RestreamOptions {
    bufferSize?: number;
}
export declare function restream(input: Readable, opts?: RestreamOptions): Promise<Readable>;
export {};
