import { join as pathJoin } from 'path'
import { tmpdir } from 'os'
import { rm } from 'fs/promises'
import { ulid } from 'ulid'

export function tmpFilename (): { filepath: string, cleanup: () => Promise<void> } {
  const filepath = pathJoin(tmpdir(), 'tmp-file-' + ulid())
  const cleanup = async function () {
    try {
      await rm(filepath)
    } catch (err) {
      console.log({ error: err, path: filepath, message: 'error_deleting_tmp_file' })
    }
  }
  return { filepath, cleanup }
}
