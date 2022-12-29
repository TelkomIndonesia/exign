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

    db.batch()
      .put(`${id}-req-0-start-line`, `${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion}`)
      .put(`${id}-req-1-headers`, headersToString(req.getHeaders()))
      .write()

    let i = 0
    const reqWrite = req.write
    req.write = (chunk, ...args) => {
      db.put(`${id}-req-2-data${i++}`, chunk)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return reqWrite.apply(req, [chunk, ...args])
    }
    const reqEnd = req.end
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    req.end = (chunk, ...args) => {
      chunk && db.put(`${id}-req-2-data${i++}`, chunk)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return reqEnd.apply(req, [chunk, ...args])
    }

    const res = await new Promise<IncomingMessage>((resolve, reject) =>
      req.once('response', resolve).once('error', reject))

    db.batch()
      .put(`${id}-res-0-status-line`, `HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}\r\n`)
      .put(`${id}-res-1-headers`, headersToString(res.headers))
      .write()

    let j = 0
    for await (const chunk of res) {
      db.put(`${id}-res-2-data-${j++}`, chunk)
    }

    if (res.trailers) {
      db.put(`${id}-res-3-trailers`, headersToString(res.trailers))
    }
  }
}
