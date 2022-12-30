"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMW = void 0;
require('express-async-errors');
function errorMW(err, _, res, next) {
    if (err) {
        console.log({ error: err });
        res.sendStatus(500);
    }
    next(err);
}
exports.errorMW = errorMW;
//# sourceMappingURL=error.js.map