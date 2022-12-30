import { mkdir, rm } from 'fs/promises'
import { request } from 'https'
import { attachID, newHTTPMessageFinder, newHTTPMessageLogger, requestIDHeader } from './log'

test('find message', async function () {
  const opts = { directory: './logs/tests' }
  await mkdir(opts.directory, { recursive: true })

  const req = request({
    host: 'mockbin.org',
    path: '/requests',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept-encoding': 'gzip'
    }
  })
  const logMessage = newHTTPMessageLogger(opts)
  logMessage(attachID(req), { url: '/requests', httpVersion: '1.1' })
  expect(req.getHeader(requestIDHeader)).toBeDefined()

  req.write(JSON.stringify({ test: true }))
  req.end()
  await new Promise((resolve, reject) => req.on('error', reject)
    .on('response', res => res.on('close', resolve).resume()))

  const find = newHTTPMessageFinder(opts)
  const readable = await find({ id: req.getHeader(requestIDHeader) as string }, { decodeBody: true })
  expect(readable).toBeTruthy()
  if (!readable) return

  const buffers : any[] = []
  for await (const chunk of readable) buffers.push(chunk)
  const record = Buffer.concat(buffers).toString()
  expect(record).toContain(req.getHeader(requestIDHeader))
  console.log(record)

  for (const db of find.dbs.values()) await db.close()
  await rm(opts.directory, { recursive: true, force: true })
}, 10000)
