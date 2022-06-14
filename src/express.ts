import { Readable } from 'stream';
import { readFileSync } from 'fs';
import express, { Application, NextFunction, Request, RequestHandler, Response } from 'express';
import { sign, digest } from './signature';
import { mapDoubleDashDomain } from './double-dash-domain';
import { createProxyServer } from './proxy';

function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
    res.on("close", function log() {
        console.log({
            request: {
                method: req.method,
                url: req.originalUrl,
                headers: req.headers,
            },
            response: {
                status: res.statusCode,
                headers: res.getHeaders()
            }
        })
    })
    next()
}

function newSignatureHandler(opts: AppOptions): RequestHandler {
    const key = readFileSync(opts.signature.keyfile, 'utf8');
    const pubKey = readFileSync(opts.signature.pubkeyfile, 'utf8');
    const proxy = createProxyServer({ ws: true }).
        on("proxyReq", function onProxyReq(proxyReq) {
            sign(proxyReq, { key: key, pubKey: pubKey })
        })
    const fn = async function signatureHandler(req: Request, res: Response) {
        const { digest: digestValue, body } = await digest(req, { bufferSize: opts.clientBodyBufferSize })
        req.headers["digest"] = digestValue

        const targetHost = await mapDoubleDashDomain(req.hostname, opts.doubleDashParentDomains) || req.hostname
        proxy.web(req, res, {
            changeOrigin: false,
            target: `${req.protocol}://${targetHost}:${req.protocol === "http" ? "80" : "443"}`,
            secure: (process.env.MPROXY_FRONT_PROXY_SECURE || "true") === "true",
            buffer: body instanceof Readable ? body
                : body ? Readable.from(body)
                    : undefined
        })
    }
    return fn
}

interface AppOptions {
    signature: {
        keyfile: string,
        pubkeyfile: string
    },
    clientBodyBufferSize: number
    doubleDashParentDomains: string[]
}

function newApp(opts: AppOptions): Application {
    const app = express();
    app.use(loggerMiddleware)
    app.all("/*", newSignatureHandler(opts))
    return app
}

export default newApp