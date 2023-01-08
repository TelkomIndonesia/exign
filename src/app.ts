import express, { Application, NextFunction, Request, RequestHandler, Response } from 'express'
import { sign } from './signature'
import { mapDoubleDashHostname } from './double-dash-domain'
import { createProxyServer } from './proxy'
import { Agent as HTTPAgent } from 'http'
import { digest, restream } from './digest'
import { attachID, consoleLog, messageIDHeader, newHTTPMessageLogger } from './log'
import { Agent as HTTPSAgent } from 'https'
import { errorMW } from './error'

interface AppOptions {
  signature: {
    key: string,
    pubkey: string
  },
  clientBodyBufferSize: number
  upstreams: {
    doubleDashDomains: string[]
    hostmap: Map<string, string>,
    secure: boolean
  }
  logdb: {
    directory: string
  }
}

function newSignatureProxyHandler (opts: AppOptions): RequestHandler {
  const logMessage = newHTTPMessageLogger(opts.logdb)

  const proxy = createProxyServer({ ws: true })
    .on('proxyReq', function onProxyReq (proxyReq, req, res) {
      if (proxyReq.getHeader('content-length') === '0') {
        proxyReq.removeHeader('content-length') // some reverse proxy drop 'content-length' when it is zero
      }

      res.setHeader(messageIDHeader, attachID(proxyReq))
      consoleLog(proxyReq)
      logMessage(proxyReq, { url: req.url || '/', httpVersion: req.httpVersion })
      sign(proxyReq, opts.signature)
    })
    .on('proxyRes', (proxyRes, _, res) => {
      proxyRes.on('end', () => res.addTrailers(proxyRes.trailers))
    })
  const httpagent = new HTTPAgent({ keepAlive: true })
  const httpsagent = new HTTPSAgent({ keepAlive: true })

  return async function signatureProxyHandler (req: Request, res: Response, next: NextFunction) {
    const [digestValue, body] = await Promise.all([
      digest(req),
      restream(req, { bufferSize: opts.clientBodyBufferSize })
    ])
    res.once('close', () => body.destroy())

    const targetHost = opts.upstreams.hostmap.get(req.hostname) ||
      await mapDoubleDashHostname(req.hostname, opts.upstreams.doubleDashDomains) ||
      req.hostname

    proxy.web(req, res,
      {
        changeOrigin: false,
        target: `${req.protocol}://${targetHost}:${req.protocol === 'http' ? '80' : '443'}`,
        secure: opts.upstreams.secure,
        buffer: body,
        headers: { digest: digestValue },
        agent: req.protocol === 'http' ? httpagent : httpsagent
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
