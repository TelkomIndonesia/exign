import { ClientRequest, IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders } from 'http'
import { Level, OpenOptions } from 'level'
import { resolve } from 'path'
import { signatureHeader } from './signature'
import logfmt from 'logfmt'
import { flatten } from 'flat'
import { decodeTime, ulid } from 'ulid'
import { PassThrough, Writable } from 'stream'
import { createBrotliDecompress, createGunzip, createInflate } from 'zlib'

export const messageIDHeader = 'x-exign-id'
const startTimeHeader = 'x-exign-start'
const start = new Date()

export function attachID (req: ClientRequest) {
  const id = ulid()
  req.setHeader(messageIDHeader, id)
  req.setHeader(startTimeHeader, start.getTime())
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

function headersToString (headers: IncomingHttpHeaders | OutgoingHttpHeaders) {
  return Object.entries(headers)
    .reduce((str, [name, value]) => {
      return str + name + ': ' + (Array.isArray(value) ? value.join(',') : value + '\r\n')
    }, '') + '\r\n'
}

function logDBName (date?: Date) {
  date = date || new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${date.getDate()}`
}

interface LogDBOptions {
  directory: string
}
interface ClientRequestLine {
  url: string
  httpVersion: string
}
interface LogDBFindQuery {
  id: string
}
interface LogDBFindOptions {
  decodeBody?: boolean
}
export class LogDB {
  private directory: string
  private databases: Map<string, Level<string, Buffer>>

  constructor (opts: LogDBOptions) {
    this.directory = opts.directory
    this.databases = new Map()
  }

  private async getDB (date?: Date, opts?: OpenOptions) {
    const name = logDBName(date)
    let db = this.databases.get(name)
    if (!db) {
      try {
        db = new Level<string, Buffer>(resolve(this.directory, name), { ...opts, valueEncoding: 'buffer' })
        this.databases.set(name, db)
        await db.open()
      } catch (err) {
        console.error('[ERROR] failed opening level DB: ', err)
        this.databases.delete(name)
        return
      }
    }
    return db
  }

  async log (req: ClientRequest, reqLine: ClientRequestLine) {
    const id = req.getHeader(messageIDHeader)
    if (!id) {
      return
    }

    const db = await this.getDB()
    if (!db) {
      throw new Error('[FATAL] Can not open LogDB')
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
      `${req.method.toUpperCase()} ${reqLine.url} HTTP/${reqLine.httpVersion || '1.1'}\r\n` +
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

  async find (query: LogDBFindQuery, fopts?: LogDBFindOptions) {
    const date = new Date(decodeTime(query.id))
    const db = await this.getDB(date, { createIfMissing: false })
    if (!db) {
      return
    }

    const filter = { gt: query.id, lt: query.id + '_' }
    const keys = await db.keys({ ...filter, limit: 1 }).all()
    if (!keys || keys.length < 1) {
      return
    }

    const stream = new PassThrough()
    const pipeLog = async function pipeLog () {
      let decoder: Writable | undefined
      for await (const [key, value] of db.iterator(filter)) {
        if (key.endsWith('-req-2') || key.endsWith('-res-2')) {
          if (decoder) {
            await new Promise((resolve, reject) => decoder?.on('close', resolve).on('error', reject).end())
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
            case 'gzip': decoder = createGunzip(); break
            case 'br': decoder = createBrotliDecompress(); break
            case 'deflate': decoder = createInflate(); break
          }
          decoder && decoder.pipe(stream, { end: false })
          stream.on('error', () => decoder?.destroy())
        }
      }

      stream.end()
    }

    setImmediate(async () => {
      try {
        await pipeLog()
      } catch (err) {
        console.error('[ERROR] fail to pipe log from db: ', err)
      }
    })

    return stream
  }

  async close () {
    for (const db of this.databases.values()) {
      await db.close()
    }
    this.databases.clear()
  }
}
