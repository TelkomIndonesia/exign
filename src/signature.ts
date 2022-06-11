import * as crypto from 'node:crypto';
import * as httpSignature from 'http-signature';
import * as sshpk from 'sshpk';
import * as fs from 'fs';
import { ClientRequest, IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { tmpFilename } from './util';
const pipelineProm = promisify(pipeline)

interface digestOptions {
    maxBufferSize?: number
}
export async function digest(req: IncomingMessage, opts?: digestOptions): Promise<{ digest: string, body: string | Readable }> {
    const digest = new Promise<string>((resolve, reject) => {
        const hash = crypto.createHash("sha256")
        req.on("data", chunk => hash.update(chunk)).
            on("error", err => reject(err)).
            on("end", () => {
                const digest = `SHA-256=${hash.digest("base64").toString()}`
                resolve(digest)
            })
    })

    let body: string | Readable
    if ((req.headers["content-length"] || 0) > (opts?.maxBufferSize || 8192)) {
        const { filepath, cleanup } = tmpFilename()
        await pipelineProm(req, fs.createWriteStream(filepath))
        body = fs.createReadStream(filepath).on("close", () => cleanup())

    } else {
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        body = Buffer.concat(buffers).toString();
    }

    return { digest: await digest, body }
}

const hopByHopHeaders = new Map<string, boolean>([
    ["keep-alive", true],
    ["transfer-encoding", true],
    ["te", true],
    ["connection", true],
    ["trailer", true],
    ["upgrade", true],
    ["proxy-authenticate", true],
    ["proxy-authorization", true],
])
const signatureHeader = "signature"

export const noVerifyHeaders = Array.from(hopByHopHeaders.keys()).concat([signatureHeader])

function keyFingerprint(key: string): string {
    try {
        return sshpk.parseKey(key).fingerprint('sha256').toString()
    } catch {
        return ""
    }
}
interface signOptions {
    key: string
    keyId?: string
    pubKey?: string
}
export function sign(req: ClientRequest, opts: signOptions) {
    const addParam = ["(request-target)"]
    if (!req.hasHeader("date")) addParam.push("date") // the header will be added by the library

    httpSignature.sign(req, {
        key: opts.key,
        keyId: opts.keyId || (opts.pubKey ? keyFingerprint(opts.pubKey) : ""),
        authorizationHeaderName: signatureHeader,
        headers: Object.keys(req.getHeaders()).
            concat(addParam).
            filter(v => !hopByHopHeaders.get(v.toLowerCase())),
    });
}