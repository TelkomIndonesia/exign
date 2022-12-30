import { ClientRequest, IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders } from 'http'
import { Level } from 'level'
import { resolve } from 'path'
import { signatureHeader } from './signature'
import logfmt from 'logfmt'
import { flatten } from 'flat'
import { decodeTime, ulid } from 'ulid'
import { readdir } from 'fs/promises'
import { PassThrough } from 'stream'

export const requestIDHeader = 'x-request-id'

export function attachID (req: ClientRequest) {
  req.setHeader(requestIDHeader, ulid())
  return req
}

export function consoleLog (req: ClientRequest) {
  req.on('response', (res) => {
    res.on('close', function log () {
      const obj = {
        request: {
          http_version: res.httpVersion,
          method: req.method,
          url: `${req.protocol}//${req.host}${req.path}`,
          headers: {
            requestIDHeader: req.getHeader('x-request-id'),
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

function pad (n: number, length: number) {
  return n.toString().padStart(length, '0')
}

function dbName (date?: Date) {
  date = date || new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${date.getDate()}`
}

interface newLogDBOptions {
  directory: string
}
function newLogDB (date: Date, opts: newLogDBOptions) {
  return new Level(resolve(opts.directory, dbName(date)))
}

function headersToString (headers: IncomingHttpHeaders | OutgoingHttpHeaders) {
  return Object.entries(headers)
    .reduce((str, [name, value]) => {
      return str + name + ': ' + (Array.isArray(value) ? value.join(',') : value + '\r\n')
    }, '')
}

interface ClientRequestLine {
  url: string
  httpVersion: string
}
export function newHTTPMessageLogger (opts: newLogDBOptions) {
  const db = newLogDB(new Date(), opts)
  const fn = async function logHTTPMessage (req: ClientRequest, reqLine: ClientRequestLine) {
    const id = req.getHeader(requestIDHeader)
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
        chunk && db.put(`${id}-req-2-${pad(i++, 16)}`, chunk)
        return fn.apply(req, [chunk, ...args])
      }
    } /* eslint-enable @typescript-eslint/no-explicit-any */
    req.write = wrapWriteEnd(req, req.write)
    req.end = wrapWriteEnd(req, req.end)

    const res = await new Promise<IncomingMessage>((resolve, reject) =>
      req.once('response', resolve).once('error', reject))

    db.batch()
      .put(`${id}-res-0`, `HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}`)
      .put(`${id}-res-1`, headersToString(res.headers))
      .write()

    let j = 0; for await (const chunk of res) {
      db.put(`${id}-res-2-${pad(j++, 16)}`, chunk)
    }

    res.trailers && db.put(`${id}-res-3`, headersToString(res.trailers))
  }
  fn.db = db

  return fn
}

interface httpMessageQuery {
  id: string
}
export function newHTTPMessageFinder (opts: newLogDBOptions) {
  const dbs = new Map<string, Level<string, string>>()
  const dbDates = readdir(opts.directory, { withFileTypes: true })
    .then(entries => entries
      .filter(v => v.isDirectory())
      .reduce((arr, v) => {
        arr.push(new Date(Date.parse(v.name)))
        return arr
      }, [] as Date[])
    )

  const fn = async function findHTTPMessage (query:httpMessageQuery) {
    const date = new Date(decodeTime(query.id))

    let dbDate: Date|undefined
    for (const d of await dbDates) {
      if (dbDate && d.getTime() < dbDate.getTime()) {
        continue
      }
      if (d.getTime() > date.getTime()) {
        continue
      }

      dbDate = d
    }
    if (!dbDate) {
      return
    }

    const name = dbName(dbDate); let db = dbs.get(name)
    if (!db) {
      db = newLogDB(dbDate, opts)
      dbs.set(name, db)
    }

    const stream = new PassThrough()
    for await (const [, value] of db.iterator({ gt: query.id, lt: query.id + '_' })) {
      const ok = stream.write(value)
      if (!ok) {
        await new Promise(resolve => stream.on('drain', resolve))
      }
      stream.write('\r\n')
    }
    stream.end()
    return stream
  }
  fn.dbs = dbs

  return fn
}
