"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDoubleDashDomain = exports.mapDoubleDashDomainDNS = void 0;
const tslib_1 = require("tslib");
const promises_1 = require("dns/promises");
const ttlcache_1 = tslib_1.__importDefault(require("@isaacs/ttlcache"));
const doubleDashDomainDNSCache = new ttlcache_1.default({ ttl: 1000 * 60, max: 100 });
const key = "double-dash-domain";
function mapDoubleDashDomainDNS(hostname) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const v = doubleDashDomainDNSCache.get(hostname);
        if (v !== undefined)
            return v;
        let txt;
        try {
            txt = yield (0, promises_1.resolveTxt)(hostname);
        }
        catch (err) {
            return "";
        }
        let domain = "";
        for (const records of txt) {
            for (let value of records) {
                value = value.startsWith(key + "=") ? value.substring(key.length + 1) : "";
                if (!hostname.endsWith("." + value) || value.length < domain.length)
                    continue;
                domain = value;
            }
        }
        doubleDashDomainDNSCache.set(hostname, domain);
        return domain;
    });
}
exports.mapDoubleDashDomainDNS = mapDoubleDashDomainDNS;
const doubledash = "--";
function mapDoubleDashDomain(hostname, doubledashParentDomains) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (hostname.indexOf(doubledash) < 0)
            return;
        let parentdomain = "";
        for (const v of doubledashParentDomains) {
            if (!hostname.endsWith("." + v) || v.length < parentdomain.length)
                continue;
            parentdomain = v;
        }
        if (!parentdomain)
            parentdomain = yield mapDoubleDashDomainDNS(hostname);
        if (!parentdomain)
            return;
        const part = hostname.substring(0, hostname.indexOf("." + parentdomain)).split(/--(?=[^-.])/);
        if (part.length == 0)
            return;
        return part[part.length - 1] + "." + parentdomain;
    });
}
exports.mapDoubleDashDomain = mapDoubleDashDomain;
//# sourceMappingURL=double-dash-domain.js.map