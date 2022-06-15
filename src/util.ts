import { v4 as uuidv4 } from 'uuid'
import { join as pathJoin } from 'path'
import { tmpdir } from 'os'
import { rm } from 'fs/promises'

export function tmpFilename (): { filepath: string, cleanup: () => Promise<void> } {
  const filepath = pathJoin(tmpdir(), 'tmp-file-' + uuidv4())
  const cleanup = async function () {
    try {
      await rm(filepath)
    } catch (err) {
      console.log({ error: err, path: filepath, message: 'error_deleting_tmp_file' })
    }
  }
  return { filepath, cleanup }
}
