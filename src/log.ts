import { ClientRequest, IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders } from 'http'
import { Level } from 'level'
import { resolve } from 'path'
import { signatureHeader } from './signature'
import logfmt from 'logfmt'
import { flatten } from 'flat'

interface newLogDBOptions {
  directory: string
}
function newLogDB (opts: newLogDBOptions) {
  const now = new Date()
  const date = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  return new Level(resolve(opts.directory, date))
}

function headersToString (headers: IncomingHttpHeaders | OutgoingHttpHeaders) {
  return Object.entries(headers)
    .reduce((str, [name, value]) => {
      return str + name + ': ' + (Array.isArray(value) ? value.join(',') : value + '\r\n')
    }, '') + '\r\n'
}
function pad (n: number) {
  return n.toString().padStart(16, '0')
}

interface ClientRequestLine {
  url: string
  httpVersion: string
}
export function newHTTPMessageLogger (opts: newLogDBOptions) {
  const db = newLogDB(opts)

  return async function logHTTPMessage (req: ClientRequest, reqLine: ClientRequestLine) {
    const id = req.getHeader('x-request-id')
    if (!id) {
      return
    }

    db.batch()
      .put(`${id}-req-0`, `${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion}`)
      .put(`${id}-req-1`, headersToString(req.getHeaders()))
      .write()

    /* eslint-disable @typescript-eslint/no-explicit-any */
    let i = 0; const wrapWriteEnd = function wrapWriteEnd (req: ClientRequest, fn: (chunk:any, ...args:any) => any) {
      return function wrapped (chunk:any, ...args:any) {
        chunk && db.put(`${id}-req-2-${pad(i++)}`, chunk)
        return fn.apply(req, [chunk, ...args])
      }
    } /* eslint-enable @typescript-eslint/no-explicit-any */
    req.write = wrapWriteEnd(req, req.write)
    req.end = wrapWriteEnd(req, req.end)

    const res = await new Promise<IncomingMessage>((resolve, reject) =>
      req.once('response', resolve).once('error', reject))

    db.batch()
      .put(`${id}-res-0`, `HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}\r\n`)
      .put(`${id}-res-1`, headersToString(res.headers))
      .write()

    let j = 0; for await (const chunk of res) {
      db.put(`${id}-res-2-${pad(j++)}`, chunk)
    }

    res.trailers && db.put(`${id}-res-3`, headersToString(res.trailers))
  }
}

export function consolelog (req: ClientRequest) {
  req.on('response', (res) => {
    res.on('close', function log () {
      const obj = {
        request: {
          http_version: res.httpVersion,
          method: req.method,
          url: `${req.protocol}//${req.host}${req.path}`,
          headers: {
            'x-request-id': req.getHeader('x-request-id'),
            digest: req.getHeader('digest'),
            [signatureHeader]: req.getHeader(signatureHeader)
          }
        },
        response: {
          status: res.statusCode,
          headers: Object.keys(res.headers).length > 0 ? res.headers : undefined,
          trailers: Object.keys(res.trailers).length > 0 ? res.trailers : undefined
        }
      }
      logfmt.log(flatten(obj, { maxDepth: 5 }))
    })
  })
}
