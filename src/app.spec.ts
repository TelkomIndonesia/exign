import request from 'supertest'
import * as httpSignature from 'http-signature'
import nock from 'nock'
import { ClientRequest } from 'http'
import { noVerifyHeaders } from './signature'
import { newApp } from './app'
import { Application } from 'express'
import { ulid } from 'ulid'

const testKey = {
  private: `
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEINxhdD4PiZV6hWP5LPzd8gHj+5RmPAz3IQwE+zj1ylRqoAoGCCqGSM49
AwEHoUQDQgAEmdjI3/GyAqdKE73qCthlGDwfwU6PNgn8i4FhzILRVo/I6fZC+sb5
SoZDgR/T6MXzVmj3qLRKw73J86OItmezGw==
-----END EC PRIVATE KEY-----
`,
  public: `
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEmdjI3/GyAqdKE73qCthlGDwfwU6P
Ngn8i4FhzILRVo/I6fZC+sb5SoZDgR/T6MXzVmj3qLRKw73J86OItmezGw==
-----END PUBLIC KEY-----
`,
  id: 'SHA256:JB72jpoWUunMRa9m0SVoa8Ms1Z2wL/5AZ4cVLw+bgd4'
}

function interceptReq (url: URL, method: string): Promise<ClientRequest & { headers: Record<string, string>, url: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('timeout after 5s'))
    }, 5000)

    nock(url.toString())
      .intercept(url.pathname, method)
      .reply(200, function () {
        clearTimeout(timeout)
        const req = Object.assign(this.req, { url: url.pathname + url.search })
        resolve(req)
      })
  })
}

function newTestApp (): { app: Application } {
  const app = newApp({
    hostmap: new Map<string, string>(),
    doubleDashDomains: ['domain.test'],
    clientBodyBufferSize: 32,
    signature: {
      keyfile: testKey.private,
      pubkeyfile: testKey.public
    },
    secure: true,
    logdb: {
      directory: 'logs'
    }
  })
  return { app }
}

describe('Express App', function () {
  const deferrers: { (): void }[] = []
  let app: Application
  beforeEach(function () {
    ({ app } = newTestApp())
  })
  afterEach(function () {
    for (const fn of deferrers) fn()
  })

  test('should sign and proxy the ClientRequest', async function () {
    const url = new URL('http://name.domain.test'); const method = 'get'
    const promReq = interceptReq(url, method)
    await request(app)
      .get(url.pathname)
      .set('host', ulid() + '--' + url.hostname)
    const req = await promReq
    const parsed = httpSignature.parseRequest(req, {
      headers: Object.keys(req.headers)
        .filter(v => !noVerifyHeaders.includes(v))
    })
    expect(parsed.keyId).toEqual(testKey.id)
    expect(httpSignature.verifySignature(parsed, testKey.public)).toEqual(true)
  })
})
