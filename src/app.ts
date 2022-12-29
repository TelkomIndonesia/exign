import express, { Application, NextFunction, Request, RequestHandler, Response } from 'express'
import { sign } from './signature'
import { mapDoubleDashHostname } from './double-dash-domain'
import { createProxyServer } from './proxy'
import { ClientRequest } from 'http'
import { digest, restream } from './digest'
import { newResponseLogger } from './log'
require('express-async-errors')

function errorMW (err: Error, _: Request, res: Response, next: NextFunction) {
  if (err) {
    console.log({ error: err })
    res.sendStatus(500)
  }
  next(err)
}

function log (req: ClientRequest) {
  req.on('response', (res) => {
    res.on('close', function log () {
      console.log({
        request: {
          method: req.method,
          url: `${req.protocol}//${req.host}${req.path}`,
          headers: req.getHeaders()
        },
        response: {
          status: res.statusCode,
          headers: res.headers,
          trailers: res.trailers
        }
      })
    })
  })
}

interface AppOptions {
  signature: {
    keyfile: string,
    pubkeyfile: string
  },
  clientBodyBufferSize: number
  doubleDashDomains: string[]
  hostmap: Map<string, string>,
  secure: boolean
  logdb: {
    directory: string
  }
}

function newSignatureProxyHandler (opts: AppOptions): RequestHandler {
  const key = opts.signature.keyfile
  const pubKey = opts.signature.pubkeyfile
  const resLogger = newResponseLogger(opts.logdb)
  const proxy = createProxyServer({ ws: true })
    .on('proxyReq', function onProxyReq (proxyReq) {
      if (proxyReq.getHeader('content-length') === '0') {
        proxyReq.removeHeader('content-length') // some reverse proxy drop 'content-length' when it is zero
      }

      log(proxyReq)
      sign(proxyReq, { key, pubKey })
    })
    .on('proxyRes', resLogger)

  return async function signatureProxyHandler (req: Request, res: Response, next: NextFunction) {
    const targetHost = opts.hostmap.get(req.hostname) ||
      await mapDoubleDashHostname(req.hostname, opts.doubleDashDomains) ||
      req.hostname

    const [digestValue, body] = await Promise.all([
      digest(req),
      restream(req, { bufferSize: opts.clientBodyBufferSize })
    ])
    res.once('close', () => body.destroy())

    proxy.web(req, res,
      {
        changeOrigin: false,
        target: `${req.protocol}://${targetHost}:${req.protocol === 'http' ? '80' : '443'}`,
        secure: opts.secure,
        buffer: body,
        headers: { digest: digestValue }
      },
      err => next(err))
  }
}

export function newApp (opts: AppOptions): Application {
  const app = express()
  app.all('/*', newSignatureProxyHandler(opts))
  app.use(errorMW)

  return app
}
