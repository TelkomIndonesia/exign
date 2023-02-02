"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDoubleDashHostname = exports.mapDoubleDashHostnameDNS = void 0;
const tslib_1 = require("tslib");
const promises_1 = require("dns/promises");
const ttlcache_1 = tslib_1.__importDefault(require("@isaacs/ttlcache"));
const doubledash = '--';
const doubledashTXTKey = 'double-dash-domain';
const dnsCache = new ttlcache_1.default({ ttl: 1000 * 60, max: 100 });
function mapDoubleDashHostnameDNS(hostname) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const v = dnsCache.get(hostname);
        if (v !== undefined) {
            return v;
        }
        let txt;
        try {
            txt = yield (0, promises_1.resolveTxt)(hostname);
        }
        catch (err) {
            return '';
        }
        let domain = '';
        for (const records of txt) {
            for (let value of records) {
                value = value.startsWith(doubledashTXTKey + '=') ? value.substring(doubledashTXTKey.length + 1) : '';
                if (!hostname.endsWith('.' + value) || value.length < domain.length) {
                    continue;
                }
                domain = value;
            }
        }
        dnsCache.set(hostname, domain);
        return domain;
    });
}
exports.mapDoubleDashHostnameDNS = mapDoubleDashHostnameDNS;
function mapDoubleDashHostname(hostname, doubledashdomain) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (hostname.indexOf(doubledash) < 0) {
            return;
        }
        let domain = '';
        for (const v of doubledashdomain) {
            if (!hostname.endsWith('.' + v) || v.length < domain.length) {
                continue;
            }
            domain = v;
        }
        if (!domain) {
            domain = yield mapDoubleDashHostnameDNS(hostname);
        }
        if (!domain) {
            return;
        }
        const part = hostname
            .substring(0, hostname.indexOf('.' + domain))
            .split(/--(?=[^-.])/);
        if (part.length === 0) {
            return;
        }
        return part[part.length - 1] + '.' + domain;
    });
}
exports.mapDoubleDashHostname = mapDoubleDashHostname;
//# sourceMappingURL=double-dash-domain.js.map