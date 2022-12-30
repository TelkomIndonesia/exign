import express, { Application } from 'express'
import { pipeline } from 'stream/promises'
import { errorMW } from './error'
import { newHTTPMessageFinder } from './log'

interface appLogOptions {
    logdb: {
      directory:string
    }
  }
export function newLogApp (opts:appLogOptions) : Application {
  const app = express()

  const findHTTPMessage = newHTTPMessageFinder(opts.logdb)
  app.get('/message/:id', async (req, res) => {
    const msg = await findHTTPMessage({ id: req.params.id }, { decodeBody: req.query['decode-body'] === 'true' })
    if (!msg) {
      return res.status(404).send('not found')
    }

    res.setHeader('content-type', 'text/plain')
    await pipeline(msg, res)
    return res.end()
  })

  app.use(errorMW)

  return app
}
