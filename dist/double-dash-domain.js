"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDoubleDashDomain = exports.mapDoubleDashDomainDNS = void 0;
var tslib_1 = require("tslib");
var dns = tslib_1.__importStar(require("node:dns"));
var ttlcache_1 = tslib_1.__importDefault(require("@isaacs/ttlcache"));
var doubleDashDomainDNSCache = new ttlcache_1.default({ ttl: 1000 * 60, max: 100 });
var key = "double-dash-domain";
function mapDoubleDashDomainDNS(hostname) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var v, txt, err_1, domain, _i, txt_1, records, _a, records_1, value;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    v = doubleDashDomainDNSCache.get(hostname);
                    if (v !== undefined)
                        return [2 /*return*/, v];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, dns.promises.resolveTxt(hostname)];
                case 2:
                    txt = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _b.sent();
                    return [2 /*return*/, ""];
                case 4:
                    domain = "";
                    for (_i = 0, txt_1 = txt; _i < txt_1.length; _i++) {
                        records = txt_1[_i];
                        for (_a = 0, records_1 = records; _a < records_1.length; _a++) {
                            value = records_1[_a];
                            value = value.startsWith(key + "=") ? value.substring(key.length + 1) : "";
                            if (!hostname.endsWith("." + value) || value.length < domain.length)
                                continue;
                            domain = value;
                        }
                    }
                    doubleDashDomainDNSCache.set(hostname, domain);
                    return [2 /*return*/, domain];
            }
        });
    });
}
exports.mapDoubleDashDomainDNS = mapDoubleDashDomainDNS;
function mapDoubleDashDomain(hostname, doubledashParentDomains) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var parentdomain, _i, doubledashParentDomains_1, v, part;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (hostname.indexOf("--") < 0)
                        return [2 /*return*/];
                    parentdomain = "";
                    for (_i = 0, doubledashParentDomains_1 = doubledashParentDomains; _i < doubledashParentDomains_1.length; _i++) {
                        v = doubledashParentDomains_1[_i];
                        if (!hostname.endsWith("." + v) || v.length < parentdomain.length)
                            continue;
                        parentdomain = v;
                    }
                    if (!!parentdomain) return [3 /*break*/, 2];
                    return [4 /*yield*/, mapDoubleDashDomainDNS(hostname)];
                case 1:
                    parentdomain = _a.sent();
                    _a.label = 2;
                case 2:
                    if (!parentdomain)
                        return [2 /*return*/];
                    part = hostname.substring(0, hostname.indexOf("." + parentdomain)).split(/--(?=[^-.])/);
                    if (part.length == 0)
                        return [2 /*return*/];
                    return [2 /*return*/, part[part.length - 1] + "." + parentdomain];
            }
        });
    });
}
exports.mapDoubleDashDomain = mapDoubleDashDomain;
//# sourceMappingURL=double-dash-domain.js.map