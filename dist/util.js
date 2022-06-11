"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tmpFilename = void 0;
const tslib_1 = require("tslib");
const uuid_1 = require("uuid");
const path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const os = tslib_1.__importStar(require("os"));
function tmpFilename() {
    const filepath = path.join(os.tmpdir(), "tmp-file-" + (0, uuid_1.v4)());
    const cleanup = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.promises.rm(filepath);
            }
            catch (err) {
                console.log({ error: err, path: filepath, message: "error_deleting_tmp_file" });
            }
        });
    };
    return { filepath, cleanup };
}
exports.tmpFilename = tmpFilename;
//# sourceMappingURL=util.js.map