import { v4 as uuidv4 } from 'uuid'
import * as path from "path"
import * as fs from "fs"
import * as os from "os"

export function tmpFilename(): { filepath: string, cleanup: () => Promise<void> } {
    const filepath = path.join(os.tmpdir(), "tmp-file-" + uuidv4())
    const cleanup = async function () {
        try {
            await fs.promises.rm(filepath)
        } catch (err) {
            console.log({ error: err, path: filepath, message: "error_deleting_tmp_file" },)
        }
    }
    return { filepath, cleanup }
}