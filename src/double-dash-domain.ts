import * as dns from 'node:dns'
import TTLCache from '@isaacs/ttlcache'

const doubleDashDomainDNSCache = new TTLCache({ ttl: 1000 * 60, max: 100 })
const key = "double-dash-domain"
export async function mapDoubleDashDomainDNS(hostname: string): Promise<string> {
    const v: string = doubleDashDomainDNSCache.get(hostname)
    if (v !== undefined)
        return v


    let txt: string[][]
    try {
        txt = await dns.promises.resolveTxt(hostname)
    } catch (err) {
        return ""
    }

    let domain = ""
    for (const records of txt) {
        for (let value of records) {
            value = value.startsWith(key + "=") ? value.substring(key.length + 1) : ""
            if (!hostname.endsWith("." + value) || value.length < domain.length)
                continue

            domain = value
        }
    }

    doubleDashDomainDNSCache.set(hostname, domain)
    return domain
}

const doubledash = "--"

export async function mapDoubleDashDomain(hostname: string, doubledashParentDomains: string[]): Promise<string | undefined> {
    if (hostname.indexOf(doubledash) < 0) return

    let parentdomain = ""
    for (const v of doubledashParentDomains) {
        if (!hostname.endsWith("." + v) || v.length < parentdomain.length) continue
        parentdomain = v
    }

    if (!parentdomain)
        parentdomain = await mapDoubleDashDomainDNS(hostname)

    if (!parentdomain) return

    const part = hostname.substring(0, hostname.indexOf("." + parentdomain)).split(/--(?=[^-.])/)
    if (part.length == 0) return

    return part[part.length - 1] + "." + parentdomain
}