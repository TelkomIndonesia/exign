import { createHash, Hash } from 'crypto'
import { FileHandle, open, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { ulid } from 'ulid'
import { createPool, Pool } from 'generic-pool'

interface File {
  name: string
  valid: boolean
  handle: FileHandle
}

const fileFactory = {
  create: async function create () : Promise<File> {
    const name = resolve(tmpdir(), 'exign-file-' + ulid())
    const handle = await open(name, 'w+')
    const valid = true
    return { name, valid, handle }
  },
  validate: async function validate (file: File) {
    return file.valid
  },
  destroy: async function destroy (file: File) {
    await file.handle.close()
    rm(file.name)
  }
}

interface RestreamerOptions {
  memBufferSize?: number
  fileBufferPoolMin?: number
  fileBufferPoolMax?: number
}
export class Restreamer {
  fileBufferPool: Pool<File>
  memBufferSize: number

  constructor (opts?: RestreamerOptions) {
    this.fileBufferPool = createPool(fileFactory, {
      min: opts?.fileBufferPoolMin || 8,
      max: opts?.fileBufferPoolMax || 1024,
      testOnBorrow: true,
      evictionRunIntervalMillis: 60 * 1000
    })
    this.memBufferSize = opts?.memBufferSize || 8192
  }

  async restream (input: Readable) {
    const buffers = []

    let file: File | undefined
    const fbPool = this.fileBufferPool

    for await (const chunk of input) {
      if (!file && buffers.length + chunk.length <= this.memBufferSize) {
        buffers.push(chunk)
        continue
      }

      if (!file) {
        file = await fbPool.acquire()
        await file.handle.write(Buffer.from(buffers))
      }
      await file.handle.write(chunk)
    }

    if (file) {
      const closer = async function closer () {
        if (!file) return
        await file.handle.truncate()
        fbPool.release(file)
      }
      return file.handle.createReadStream({ start: 0, autoClose: false })
        .once('end', closer)
        .once('error', closer)
        .once('close', () => { if (file) file.valid = false })
    }

    return Readable.from(buffers, { objectMode: false })
  }

  async close () {
    await this.fileBufferPool.drain()
    this.fileBufferPool.clear()
  }
}

export function formatHash (hash: Hash) {
  return 'SHA-256=' + hash.digest('base64').toString()
}

export async function digest (input: Readable) {
  const hash = createHash('sha256')
  await pipeline(input, hash)
  return formatHash(hash)
}
