import { ClientRequest, IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders } from 'http'
import { Level } from 'level'
import { resolve } from 'path'

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

interface ClientRequestLine {
  url: string
  httpVersion: string
}

export function newHTTPMessageLogger (opts: newLogDBOptions) {
  const db = newLogDB(opts)

  return async function logMessage (req: ClientRequest, reqLine: ClientRequestLine) {
    const id = req.getHeader('x-request-id')
    if (!id) {
      return
    }

    const pad = function pad (n: number) { return n.toString().padStart(16, '0') }

    db.batch()
      .put(`${id}-req-0-start-line`, `${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion}`)
      .put(`${id}-req-1-headers`, headersToString(req.getHeaders()))
      .write()

    let i = 0; const wrapWriteEnd = function wrapWriteEnd (req: ClientRequest, fn: (chunk:any, ...args:any) => any) {
      return function wrapped (chunk:any, ...args:any) : any {
        chunk && db.put(`${id}-req-2-data-${pad(i++)}`, chunk)
        return fn.apply(req, [chunk, ...args])
      }
    }
    req.write = wrapWriteEnd(req, req.write)
    req.end = wrapWriteEnd(req, req.end)

    const res = await new Promise<IncomingMessage>((resolve, reject) =>
      req.once('response', resolve).once('error', reject))

    db.batch()
      .put(`${id}-res-0-status-line`, `HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}\r\n`)
      .put(`${id}-res-1-headers`, headersToString(res.headers))
      .write()

    let j = 0; for await (const chunk of res) {
      db.put(`${id}-res-2-data-${pad(j++)}`, chunk)
    }

    if (res.trailers) {
      db.put(`${id}-res-3-trailers`, headersToString(res.trailers))
    }
  }
}
