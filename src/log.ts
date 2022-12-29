import { IncomingHttpHeaders, IncomingMessage } from 'http'
import { Level } from 'level'
import { resolve } from 'path'

interface newLogDBOptions {
    directory: string
}

function newLogDB (opts: newLogDBOptions) {
  const now = new Date()
  const subdirname = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`
  return new Level(resolve(opts.directory, subdirname))
}

function headersToString (headers: IncomingHttpHeaders) {
  return Object.entries(headers)
    .reduce((str, [name, value]) => {
      str += name + ': ' + (Array.isArray(value) ? value.join(',') : value + '\r\n')
      return str
    }, '') + '\r\n'
}

export function newResponseLogger (opts: newLogDBOptions) {
  const db = newLogDB(opts)

  return async function logResponse (res: IncomingMessage) {
    const id = res.headers['x-request-id']
    if (!id) {
      return
    }

    db.batch()
      .put(`${id}-0-status-line`, `HTTP/${res.httpVersion} ${res.statusCode || 0} ${res.statusMessage || 'Empty'}\r\n`)
      .put(`${id}-1-headers`, headersToString(res.headers))
      .write()
    let i = 0
    for await (const chunk of res) {
      db.put(`${id}-2-data-${i++}`, chunk)
    }
    if (res.trailers) {
      db.put(`${id}-3-trailers`, headersToString(res.trailers))
    }
  }
}
