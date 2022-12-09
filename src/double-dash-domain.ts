import { resolveTxt } from 'dns/promises'
import TTLCache from '@isaacs/ttlcache'

const doubledash = '--'
const doubledashTXTKey = 'double-dash-domain'
const dnsCache = new TTLCache({ ttl: 1000 * 60, max: 100 })

export async function mapDoubleDashHostnameDNS (hostname: string): Promise<string> {
  const v: string = dnsCache.get(hostname)
  if (v !== undefined) {
    return v
  }

  let txt: string[][]
  try {
    txt = await resolveTxt(hostname)
  } catch (err) {
    return ''
  }

  let domain = ''
  for (const records of txt) {
    for (let value of records) {
      value = value.startsWith(doubledashTXTKey + '=') ? value.substring(doubledashTXTKey.length + 1) : ''
      if (!hostname.endsWith('.' + value) || value.length < domain.length) {
        continue
      }

      domain = value
    }
  }

  dnsCache.set(hostname, domain)
  return domain
}

export async function mapDoubleDashHostname (hostname: string, doubledashdomain: string[]): Promise<string | undefined> {
  if (hostname.indexOf(doubledash) < 0) {
    return
  }

  let domain = ''
  for (const v of doubledashdomain) {
    if (!hostname.endsWith('.' + v) || v.length < domain.length) {
      continue
    }

    domain = v
  }
  if (!domain) {
    domain = await mapDoubleDashHostnameDNS(hostname)
  }
  if (!domain) {
    return
  }

  const part = hostname
    .substring(0, hostname.indexOf('.' + domain))
    .split(/--(?=[^-.])/)
  if (part.length === 0) {
    return
  }

  return part[part.length - 1] + '.' + domain
}
