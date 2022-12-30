import { createHash, Hash } from 'crypto'
import { FileHandle, open } from 'fs/promises'
import { Readable } from 'stream'
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

  let tmpFile: FileHandle | undefined
  let tmpFileCleanup: (() => void) | undefined
  for await (const chunk of input) {
    if (!tmpFile && buffers.length + chunk.length <= maxBufSize) {
      buffers.push(chunk)
      continue
    }

    if (!tmpFile) {
      const { filepath, cleanup } = tmpFilename();
      [tmpFile, tmpFileCleanup] = [await open(filepath, 'w+'), cleanup]
      await tmpFile.write(Buffer.from(buffers))
    }
    await tmpFile.write(chunk)
  }

  if (tmpFile && tmpFileCleanup) {
    return tmpFile.createReadStream({ start: 0 }).once('close', tmpFileCleanup)
  } else {
    return Readable.from(buffers, { objectMode: false })
  }
}
