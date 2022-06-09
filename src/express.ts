import express from 'express';
import { createProxyServer } from './proxy';
import { mapDoubleDashDomain } from './double-dash-domain';
import { Readable } from 'stream';
import { sign, digest } from './signature';
import config from "./config"
import { readFileSync } from 'fs';

const app = express();
app.use(function logger(req, res, next) {
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
})

const key = readFileSync(config.signature.keyfile, 'utf8');
const pubKey = readFileSync(config.signature.pubkeyfile, 'utf8');
const proxy = createProxyServer({ ws: true }).
    on("proxyReq", function onProxyReq(proxyReq) {
        sign(proxyReq, { key: key, pubKey: pubKey })
    })
app.all("/*", async function proxyHandler(req, res) {
    const { digest: digestValue, body } = await digest(req, { maxBufferSize: config.clientMaxBufferSize })
    req.headers["digest"] = digestValue

    const targetHost = await mapDoubleDashDomain(req.hostname, config.doubleDashParentDomains) || req.hostname
    proxy.web(req, res, {
        changeOrigin: false,
        target: `${req.protocol}://${targetHost}:${req.protocol === "http" ? "80" : "443"}`,
        secure: (process.env.MPROXY_FRONT_PROXY_SECURE || "true") === "true",
        buffer: body instanceof Readable ? body
            : body ? Readable.from(body)
                : undefined
    })
})

export default app