import { ClientRequest, IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders } from 'http'
import { Level } from 'level'
import { resolve } from 'path'
import { signatureHeader } from './signature'
import logfmt from 'logfmt'
import { flatten } from 'flat'
import { decodeTime, ulid } from 'ulid'
import { readdir } from 'fs/promises'
import { PassThrough, Writable } from 'stream'
import { createBrotliDecompress, createGunzip, createInflate } from 'zlib'

export const messageIDHeader = 'x-exign-id'

export function attachID (req: ClientRequest) {
  const id = ulid()
  req.setHeader(messageIDHeader, id)
  return id
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
            [messageIDHeader]: req.getHeader(messageIDHeader),
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

const databases = new Map<string, Level<string, Buffer>>()
interface newLogDBOptions {
  directory: string
}
function newLogDB (date: Date, opts: newLogDBOptions) {
  const name = dbName(date)
  let db = databases.get(name)
  if (!db) {
    db = new Level<string, Buffer>(resolve(opts.directory, name), { valueEncoding: 'buffer' })
    databases.set(name, db)
  }
  return db
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
  const db = newLogDB(new Date(), opts)
  const fn = async function logHTTPMessage (req: ClientRequest, reqLine: ClientRequestLine) {
    const id = req.getHeader(messageIDHeader)
    if (!id) {
      return
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    let i = 0; const wrapWriteEnd = function wrapWriteEnd (req: ClientRequest, fn: (chunk: any, ...args: any) => any) {
      return function wrapped (chunk: any, ...args: any) {
        chunk && db.put(`${id}-req-1-${pad(i++, 16)}`, chunk)
        return fn.apply(req, [chunk, ...args])
      }
    } /* eslint-enable @typescript-eslint/no-explicit-any */
    req.write = wrapWriteEnd(req, req.write)
    req.end = wrapWriteEnd(req, req.end)
    req.on('finish', () => db.put(`${id}-req-2`, Buffer.from('\r\n'))) // reserved for req trailers

    db.put(`${id}-req-0`, Buffer.from(
      `${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion}\r\n` +
        headersToString(req.getHeaders())
    ))

    let j = 0; const res = await new Promise<IncomingMessage>((resolve, reject) => req
      .once('error', reject)
      .once('response', (res) => {
        res.on('data', (chunk) => db.put(`${id}-res-1-${pad(j++, 16)}`, chunk))
        resolve(res)
      })
    )

    db.put(`${id}-res-0`, Buffer.from(
        `HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}\r\n` +
        headersToString(res.headers)
    ))

    res.on('end', () => {
      res.trailers && db.put(`${id}-res-2`, Buffer.from(headersToString(res.trailers)))
    })
  }
  fn.db = db

  return fn
}

interface httpMessageQuery {
  id: string
}
interface httpMesageFindOptions {
  decodeBody?: boolean
}
export function newHTTPMessageFinder (opts: newLogDBOptions) {
  const dbDates = readdir(opts.directory, { withFileTypes: true })
    .then(entries => entries
      .reduce((arr, v) => {
        if (!v.isDirectory()) {
          return arr
        }

        arr.push(new Date(Date.parse(v.name)))
        return arr
      }, [] as Date[])
    )

  const fn = async function findHTTPMessage (query: httpMessageQuery, fopts?: httpMesageFindOptions) {
    const date = new Date(decodeTime(query.id))

    let dbDate: Date | undefined
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

    const db = newLogDB(dbDate, opts)

    const stream = new PassThrough()
    let decoder: Writable | undefined
    for await (const [key, value] of db.iterator({ gt: query.id, lt: query.id + '_' })) {
      if (key.endsWith('-req-2') || key.endsWith('-res-2')) {
        if (decoder) {
          await new Promise((resolve, reject) => {
            decoder?.on('close', resolve).on('error', reject).end()
          })
          decoder = undefined
        }
        stream.write('\r\n') // add newline after body
      }

      const w = decoder || stream
      w.write(value) || await new Promise(resolve => stream.on('drain', resolve))

      if (fopts?.decodeBody && key.endsWith('-0')) {
        const enc = value.toString().split('\r\n').reduce((s, v) => {
          const [name, value] = v.split(':', 2)
          if (name.trim().toLowerCase() !== 'content-encoding') {
            return s
          }
          return value.trim().toLowerCase()
        })
        switch (enc) {
          case 'gzip':
            decoder = createGunzip(); break
          case 'br':
            decoder = createBrotliDecompress(); break
          case 'deflate':
            decoder = createInflate(); break
        }
        decoder && decoder.pipe(stream, { end: false })
        stream.on('error', () => decoder?.destroy())
      }
    }
    stream.end()

    return stream
  }
  fn.dbs = databases

  return fn
}
