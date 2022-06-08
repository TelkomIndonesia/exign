import express from 'express';
import { createProxyServer } from './proxy';
import { mapDoubleDashDomain } from './double-dash-domain';
import { Readable } from 'stream';
import * as signature from './signature';
import * as fs from 'fs';


const doubledashParentDomains = process.env.MPROXY_FRONT_DOUBLEDASH_PARENT_DOMAINS?.split(",") || []
const key = fs.readFileSync("./keys/signature/key.pem", 'utf8');
const pubKey = fs.readFileSync("./keys/signature/pubkey.pem", 'utf8');

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

const proxy = createProxyServer({ ws: true }).
    on("proxyReq", function onProxyReq(proxyReq) {
        signature.sign(proxyReq, { key: key, pubKey: pubKey })
    })

app.all("/*", async function proxyHandler(req, res) {
    const { digest, body } = await signature.digest(req, { maxBufferSize: parseInt(process.env.MPROXY_FRONT_CLIENT_MAX_BUFFER_SIZE || "") })
    req.headers["digest"] = digest

    const targetHost = await mapDoubleDashDomain(req.hostname, doubledashParentDomains) || req.hostname
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