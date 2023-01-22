import express, { Application, NextFunction, Request, RequestHandler, Response } from 'express'
import { sign, verify } from './signature'
import { mapDoubleDashHostname } from './double-dash-domain'
import { createProxyServer } from './proxy'
import { Agent as HTTPAgent, IncomingHttpHeaders } from 'http'
import { digest, Restreamer } from './digest'
import { attachID, consoleLog, LogDB, messageIDHeader } from './log'
import { Agent as HTTPSAgent } from 'https'
import { errorMW } from './error'

interface AppOptions {
  signature: {
    key: string,
    pubkey: string
  },
  digest: {
    memBufferSize: number
    fileBufferPoolMin: number,
    fileBufferPoolMax: number,
  },
  upstreams: {
    doubleDashDomains: string[]
    hostmap: Map<string, string>,
    secure: boolean
  }
  responseVerification?:{
    keys: Map<string, string>
  }
  logDB: LogDB
}

function newSignatureProxyHandler (opts: AppOptions): RequestHandler {
  const restreamer = new Restreamer(opts.digest)
  process.on('exit', () => restreamer.close())

  const logDB = opts.logDB
  const httpagent = new HTTPAgent({ keepAlive: true })
  const httpsagent = new HTTPSAgent({ keepAlive: true })

  const stop = new Map<string, string>()

  const proxy = createProxyServer({ ws: true })
    .on('proxyReq', function onProxyReq (proxyReq, req, res) {
      if (proxyReq.getHeader('content-length') === '0') {
        proxyReq.removeHeader('content-length') // some reverse proxy drop 'content-length' when it is zero
      }

      const id = attachID(proxyReq)
      res.setHeader(messageIDHeader, id)
      sign(proxyReq, opts.signature)

      consoleLog(proxyReq)
      logDB.log(proxyReq, { url: req.url || '/', httpVersion: req.httpVersion })

      proxyReq.on('response', (proxyRes) => {
        proxyRes.once('end', () => res.addTrailers(proxyRes.trailers))
        proxyRes.once('end', () => {
          if (!opts.responseVerification) {
            return
          }

          const msg = { headers: {} as IncomingHttpHeaders }
          for (const [k, v] of Object.entries(proxyRes.headers)) {
            msg.headers[k] = v
          }
          for (const [k, v] of Object.entries(proxyRes.trailers)) {
            msg.headers[k] = v
          }
          const verified = verify(msg, { publicKeys: opts.responseVerification.keys })
          if (!verified || !verified.verified) {
            stop.set(req.headers.host || '', id)
          }
        })
      })
    })

  return async function signatureProxyHandler (req: Request, res: Response, next: NextFunction) {
    if (stop.get(req.hostname)) {
      res.status(500).send(`Invalid response signature was detected from request '${stop.get(req.hostname)}'. Contact the remote administrator for further action.`)
      return
    }

    const [digestValue, body] = await Promise.all([digest(req), restreamer.restream(req)])

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
