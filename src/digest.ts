import { createHash, Hash } from 'crypto'
import { createReadStream, createWriteStream } from 'fs'
import { Readable, Writable } from 'stream'
import { pipeline } from 'stream/promises'
import { tmpFilename } from './util'

export function formatHash (hash: Hash) {
  return 'SHA-256=' + hash.digest('base64').toString()
}

export async function digest (input: Readable) {
  const hash = createHash('sha256')
  await pipeline(input, hash)
  return formatHash(hash)
}

interface RestreamOptions {
    bufferSize?: number
}
export async function restream (input: Readable, opts?: RestreamOptions) {
  const buffers = []
  const maxBufSize = opts?.bufferSize || 8192

  let filepath: string | undefined
  let cleanup: (() => void) | undefined
  let tmpFile: Writable | undefined
  for await (const chunk of input) {
    if (!tmpFile && buffers.length + chunk.length <= maxBufSize) {
      buffers.push(chunk)
      continue
    }

    if (!tmpFile) {
      ({ filepath, cleanup } = tmpFilename())
      input.pause()
      tmpFile = createWriteStream(filepath)
      tmpFile.write(Buffer.from(buffers))
      input.resume()
    }

    const ok = tmpFile.write(chunk)
    if (!ok) {
      await new Promise(resolve => tmpFile?.once('drain', resolve))
    }
  }

  if (tmpFile && filepath && cleanup) {
    tmpFile.end()
    return createReadStream(filepath).once('close', cleanup)
  } else {
    return Readable.from(buffers, { objectMode: false })
  }
}
