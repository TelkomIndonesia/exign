/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { Hash } from 'crypto';
import { FileHandle } from 'fs/promises';
import { Readable } from 'stream';
import { Pool } from 'generic-pool';
interface File {
    name: string;
    valid: boolean;
    handle: FileHandle;
}
interface RestreamerOptions {
    memBufferSize?: number;
    fileBufferPoolMin?: number;
    fileBufferPoolMax?: number;
}
export declare class Restreamer {
    fileBufferPool: Pool<File>;
    memBufferSize: number;
    constructor(opts?: RestreamerOptions);
    restream(input: Readable): Promise<Readable>;
    close(): Promise<void>;
}
export declare function formatHash(hash: Hash): string;
export declare function digest(input: Readable): Promise<string>;
export {};
