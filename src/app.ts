import express, { Application, NextFunction, Request, RequestHandler, Response } from 'express'
import { sign, verify } from './signature'
import { mapDoubleDashHostname } from './double-dash-domain'
import { createProxyServer } from './proxy'
import { Agent as HTTPAgent } from 'http'
import { digest, Restreamer } from './digest'
import { attachID, consoleLog, LogDB, messageIDHeader } from './log'
import { Agent as HTTPSAgent } from 'https'
import { errorMW } from './error'

const cacheable = import('cacheable-lookup').then(pkg => pkg.default).then(CacheableLookup => new CacheableLookup())
function withCacheableLookup<T extends HTTPAgent | HTTPSAgent> (agent: T) {
  cacheable.then(cacheable => cacheable.install(agent))
  return agent
}

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
  verification?: {
    keys: Map<string, string>
  }
  logDB: LogDB
}

const stopPeriodMilis = 10 * 1000
function formatStopMessage (messageID: string | string[] | number) {
  return `Invalid response signature was detected from request(s): '${Array.isArray(messageID) ? messageID.join("', '") : messageID}'. ` +
    `The proxy will stop receiving request for ${stopPeriodMilis.toLocaleString()} milisecond. ` +
    'Contact the remote administrator for confirmation.'
}

function newSignatureProxyHandler (opts: AppOptions): RequestHandler {
  const restreamer = new Restreamer(opts.digest)
  process.on('exit', () => restreamer.close())
  const httpagent = withCacheableLookup(new HTTPAgent({ keepAlive: true }))
  const httpsagent = withCacheableLookup(new HTTPSAgent({ keepAlive: true }))

  const logDB = opts.logDB

  const stop = new Map<string, string[]>()
  let msgIDPostfix = Date.now().toString()

  const proxy = createProxyServer({ ws: true })
    .on('proxyReq', function onProxyReq (proxyReq, req, res) {
      if (proxyReq.getHeader('content-length') === '0') {
        proxyReq.removeHeader('content-length') // some reverse proxy drop 'content-length' when it is zero
      }

      res.setHeader(messageIDHeader, attachID(proxyReq, msgIDPostfix))
      sign(proxyReq, opts.signature)

      consoleLog(proxyReq)
      logDB.log(proxyReq, { url: req.url || '/', httpVersion: req.httpVersion })
    })
    .on('proxyRes', async function onProxyRes (proxyRes, req, res) {
      res.addTrailers(proxyRes.trailers)

      if (!opts.verification) {
        return
      }
      const { verified } = await verify(proxyRes, { publicKeys: opts.verification.keys })
      if (!verified) {
        const host = req.headers.host || ''
        const id = res.getHeader(messageIDHeader)?.toString() || ''
        console.log('[ERROR] ', formatStopMessage(id))

        const stoppers = stop.get(host)
        if (!stoppers) {
          stop.set(host, [id])
          msgIDPostfix = Date.now().toString()
          setTimeout(() => stop.delete(host), stopPeriodMilis)
        } else {
          stoppers.push(id)
        }
      }
    })

  return async function signatureProxyHandler (req: Request, res: Response, next: NextFunction) {
    const stopID = stop.get(req.hostname)
    if (stopID) {
      res.status(503).send(formatStopMessage(stopID))
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
        agent: req.protocol === 'http' ? await httpagent : await httpsagent
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
