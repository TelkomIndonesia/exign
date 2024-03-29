import { mkdir, rm } from 'fs/promises'
import { IncomingMessage } from 'http'
import { request } from 'https'
import { attachID, messageIDHeader, LogDB } from './log'

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
  attachID(req, Date.now().toString())

  const logDB = new LogDB(opts)
  logDB.log(req, { url: '/requests', httpVersion: '1.1' })
  expect(req.getHeader(messageIDHeader)).toBeDefined()

  req.write(JSON.stringify({ test: true }))
  req.end()
  await new Promise<IncomingMessage>((resolve, reject) =>
    req.on('error', reject).on('response', res => res.on('close', resolve).resume()))

  const readable = await logDB.find({ id: req.getHeader(messageIDHeader) as string }, { decodeBody: true })
  expect(readable).toBeTruthy()
  if (!readable) return

  const buffers : any[] = []
  for await (const chunk of readable) buffers.push(chunk)
  const record = Buffer.concat(buffers).toString()
  expect(record).toContain(req.getHeader(messageIDHeader))
  console.log(record)

  await logDB.close()
  await rm(opts.directory, { recursive: true, force: true })
}, 10000)
