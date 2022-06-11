import { expect } from 'chai'
import request from 'supertest'
import * as httpSignature from 'http-signature'
import nock from 'nock'
import config from './config'
import { ClientRequest } from 'http'
import { noVerifyHeaders } from './signature'
import { tmpFilename } from './util'
import { writeFileSync } from 'fs'


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
`
}

function writeTmpFile(content: string) {
    const { filepath, cleanup } = tmpFilename()
    writeFileSync(filepath, content)
    return { filepath, cleanup }
}

function interceptReq(url: URL, method: string): Promise<ClientRequest & { headers: Record<string, string>, url: string }> {
    return new Promise((resolve, reject) => {
        nock(url.toString()).
            intercept(url.pathname, method).
            reply(200, function () {
                const req = Object.assign(this.req, { url: url.pathname + url.search })
                resolve(req)
            })

        setTimeout(() => {
            reject("timeout after 5s")
        }, 5000);
    })
}

describe('Signature', function () {
    const deferrers: { (): void }[] = []
    before(function () {
        const ddParentDomains = config.doubleDashParentDomains
        config.doubleDashParentDomains = ["domain.test"]
        deferrers.push(() => config.doubleDashParentDomains = ddParentDomains)

        const { filepath: key, cleanup: keyCleanup } = writeTmpFile(testKey.private)
        const oldKey = config.signature.keyfile
        config.signature.keyfile = key
        deferrers.push(() => {
            config.signature.keyfile = oldKey
            keyCleanup()
        })

        const { filepath: pub, cleanup: pubCleanup } = writeTmpFile(testKey.private)
        const oldPub = config.signature.keyfile
        config.signature.pubkeyfile = pub
        deferrers.push(() => {
            config.signature.keyfile = oldPub
            pubCleanup()
        })
        console.log(config)
    })
    after(function () {
        for (const fn of deferrers) fn()
    });

    it('should sign the ClientRequest', async function () {
        const app = (await import("./express")).default
        const url = new URL("http://name.domain.test"), method = "get"
        const promReq = interceptReq(url, method)
        await request(app).
            get(url.pathname).
            set("host", "random--" + url.hostname)
        const req = await promReq
        const parsed = httpSignature.parseRequest(req, {
            headers: Object.keys(req.headers).
                filter(v => !noVerifyHeaders.includes(v))
        })
        expect(httpSignature.verifySignature(parsed, testKey.public)).to.be.true
    })
})