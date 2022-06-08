import { Readable } from "stream";

declare global {
    namespace Express {
        export interface Request {
            rawBody?: string | Readable
        }
    }
}