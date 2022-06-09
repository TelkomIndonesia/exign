import * as crypto from 'node:crypto';
import * as httpSignature from 'http-signature';
import * as sshpk from 'sshpk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClientRequest, IncomingMessage } from 'node:http';
import { pipeline } from 'stream';
import { promisify } from 'node:util';
const pipelineProm = promisify(pipeline)
import { v4 as uuidv4 } from 'uuid'
import { Readable } from 'node:stream';

function tmpFilename(): { filepath: string, cleanup: () => Promise<void> } {
    const filepath = path.join(os.tmpdir(), "etchpass-" + uuidv4())
    const cleanup = async function () {
        try {
            await fs.promises.rm(filepath)
        } catch (err) {
            console.log({ error: err, path: filepath, message: "error_deleting_tmp_file" },)
        }
    }
    return { filepath, cleanup }
}

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
    httpSignature.sign(req, {
        key: opts.key,
        keyId: opts.keyId || (opts.pubKey ? keyFingerprint(opts.pubKey) : ""),
        authorizationHeaderName: signatureHeader,
        headers: Object.keys(req.getHeaders()).
            concat("date", "(request-target)").
            filter(v => !hopByHopHeaders.get(v.toLowerCase())),
    });
}