import express from 'express';
import { createProxyServer } from './proxy';
import { mapDoubleDashDomain } from './double-dash-domain';
import { Readable } from 'stream';
import * as signature from './signature';
import * as fs from 'fs';
import config from "./config"

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

const key = fs.readFileSync(config.signature.keyfile, 'utf8');
const pubKey = fs.readFileSync(config.signature.pubkeyfile, 'utf8');
const proxy = createProxyServer({ ws: true }).
    on("proxyReq", function onProxyReq(proxyReq) {
        signature.sign(proxyReq, { key: key, pubKey: pubKey })
    })
app.all("/*", async function proxyHandler(req, res) {
    const { digest, body } = await signature.digest(req, { maxBufferSize: config.clientMaxBufferSize })
    req.headers["digest"] = digest

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