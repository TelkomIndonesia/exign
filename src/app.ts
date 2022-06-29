import { readFileSync } from 'fs'
import express, { Application, Request, RequestHandler, Response } from 'express'
import { sign, digest } from './signature'
import { mapDoubleDashDomain } from './double-dash-domain'
import { createProxyServer } from './proxy'
import { ClientRequest, ServerResponse } from 'http'

function log (req: ClientRequest, res: ServerResponse) {
  res.on('close', function log () {
    console.log({
      request: {
        method: req.method,
        url: `${req.protocol}//${req.host}${req.path}`,
        headers: req.getHeaders()
      },
      response: {
        status: res.statusCode,
        headers: res.getHeaders()
      }
    })
  })
}

interface AppOptions {
    signature: {
        keyfile: string,
        pubkeyfile: string
    },
    clientBodyBufferSize: number
    doubleDashParentDomains: string[]
}

function newSignatureHandler (opts: AppOptions): RequestHandler {
  const key = readFileSync(opts.signature.keyfile, 'utf8')
  const pubKey = readFileSync(opts.signature.pubkeyfile, 'utf8')
  const proxy = createProxyServer({ ws: true })
    .on('proxyReq', function onProxyReq (proxyReq, _, res) {
      log(proxyReq, res)
      sign(proxyReq, { key, pubKey })
    })

  return async function signatureHandler (req: Request, res: Response) {
    const { digest: digestValue, data } = await digest(req, { bufferSize: opts.clientBodyBufferSize })
    res.on('close', () => data.destroy())

    const targetHost = await mapDoubleDashDomain(req.hostname, opts.doubleDashParentDomains) || req.hostname
    proxy.web(req, res, {
      changeOrigin: false,
      target: `${req.protocol}://${targetHost}:${req.protocol === 'http' ? '80' : '443'}`,
      secure: (process.env.MPROXY_FRONT_PROXY_SECURE || 'true') === 'true',
      buffer: data,
      headers: { digest: digestValue }
    })
  }
}

export function newApp (opts: AppOptions): Application {
  const app = express()
  app.all('/*', newSignatureHandler(opts))
  return app
}
