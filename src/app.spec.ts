import request from 'supertest'
import * as httpSignature from 'http-signature'
import nock from 'nock'
import { config } from './config'
import { ClientRequest } from 'http'
import { noVerifyHeaders } from './signature'
import { tmpFilename } from './util'
import { writeFileSync } from 'fs'
import { newApp } from './app'
import { Application } from 'express'
import { v4 as uuid4 } from 'uuid'

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

function writeTmpFile (content: string) {
  const { filepath, cleanup } = tmpFilename()
  writeFileSync(filepath, content)
  return { filepath, cleanup }
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

function newTestApp (): { app: Application, cleanup: () => void } {
  const { filepath: key, cleanup: keyCleanup } = writeTmpFile(testKey.private)
  const { filepath: pub, cleanup: pubCleanup } = writeTmpFile(testKey.private)

  const app = newApp({
    doubleDashParentDomains: ['domain.test'],
    clientBodyBufferSize: config.clientBodyBufferSize,
    signature: {
      keyfile: key,
      pubkeyfile: pub
    }
  })
  const cleanup = function tempFilesCleanup () {
    keyCleanup()
    pubCleanup()
  }
  return { app, cleanup }
}

describe('Express App', function () {
  const deferrers: { (): void }[] = []
  let app: Application
  beforeEach(function () {
    let cleanup: () => void
    ({ app, cleanup } = newTestApp())
    deferrers.push(cleanup)
  })
  afterEach(function () {
    for (const fn of deferrers) fn()
  })

  test('should sign and proxy the ClientRequest', async function () {
    const url = new URL('http://name.domain.test'); const method = 'get'
    const promReq = interceptReq(url, method)
    await request(app)
      .get(url.pathname)
      .set('host', uuid4() + '--' + url.hostname)
    const req = await promReq
    const parsed = httpSignature.parseRequest(req, {
      headers: Object.keys(req.headers)
        .filter(v => !noVerifyHeaders.includes(v))
    })
    expect(parsed.keyId).toEqual(testKey.id)
    expect(httpSignature.verifySignature(parsed, testKey.public)).toEqual(true)
  })
})
