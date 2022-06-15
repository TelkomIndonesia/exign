"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tmpFilename = void 0;
const tslib_1 = require("tslib");
const uuid_1 = require("uuid");
const path_1 = require("path");
const os_1 = require("os");
const promises_1 = require("fs/promises");
function tmpFilename() {
    const filepath = (0, path_1.join)((0, os_1.tmpdir)(), 'tmp-file-' + (0, uuid_1.v4)());
    const cleanup = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, promises_1.rm)(filepath);
            }
            catch (err) {
                console.log({ error: err, path: filepath, message: 'error_deleting_tmp_file' });
            }
        });
    };
    return { filepath, cleanup };
}
exports.tmpFilename = tmpFilename;
//# sourceMappingURL=util.js.map