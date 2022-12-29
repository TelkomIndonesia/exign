import { IncomingMessage } from 'http';
interface newLogDBOptions {
    directory: string;
}
export declare function newResponseLogger(opts: newLogDBOptions): (res: IncomingMessage) => Promise<void>;
export {};
