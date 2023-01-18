import express, { Application } from 'express'
import { pipeline } from 'stream/promises'
import { errorMW } from './error'
import { newHTTPMessageFinder } from './log'

interface mgmtAppOptions {
  signature: {
    key: string,
    pubkey: string
  },
  transport: {
    caKey: string,
    caCert: string,
  },
  logdb: {
    directory: string
  }
}

export function newMgmtApp (opts: mgmtAppOptions): Application {
  const app = express()

  const findHTTPMessage = newHTTPMessageFinder(opts.logdb)
  app.get('/messages/:id', async (req, res) => {
    const msg = await findHTTPMessage({ id: req.params.id }, { decodeBody: req.query['decode-body'] === 'true' })
    if (!msg) {
      return res.status(404).send('not found')
    }

    res.setHeader('content-type', 'text/plain')
    await pipeline(msg, res)
    return res.end()
  })

  app
    .get('/config/signature/key.pem', (_, res) => {
      return res
        .setHeader('content-type', 'text/plain')
        .send(opts.signature.key)
    })
    .get('/config/signature/pubkey.pem', (req, res) => {
      return res
        .setHeader('content-type', 'text/plain')
        .setHeader('content-disposition', req.query.dl !== undefined ? 'attachment; filename="pubkey.pem"' : 'inline')
        .send(opts.signature.pubkey)
    })
    .get('/config/transport/ca-key.pem', (_, res) => {
      return res
        .setHeader('content-type', 'text/plain')
        .send(opts.transport.caKey)
    })
    .get('/config/transport/ca.crt', (req, res) => {
      return res
        .setHeader('content-type', 'text/plain')
        .setHeader('content-disposition', req.query.dl !== undefined ? 'attachment; filename="ca.crt"' : 'inline')
        .send(opts.transport.caCert)
    })

  app.use(errorMW)

  return app
}
