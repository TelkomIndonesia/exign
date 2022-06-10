import { expect } from 'chai'
import { sign } from './signature'
import { request } from 'http'
import * as httpSignature from 'http-signature'
import nock from 'nock'

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

describe('Signature', function () {
    it('should sign the ClientRequest', function () {
        const url = new URL("http://domain.com"), method = "get"
        const scope = nock(url.toString()).
            intercept(url.pathname, method).
            reply(200, function () {
                const req = Object.assign(this.req, { url: url.pathname + url.search })
                const parsed = httpSignature.parseRequest(req, {
                    headers: Object.keys(req.headers).filter(v => v !== "signature")
                })
                expect(httpSignature.verifySignature(parsed, testKey.public)).to.be.true
            })
        const req = request(url, { method, headers: { host: url.hostname } }).
            on("response", () => { scope.done() })

        sign(req, { key: testKey.private, pubKey: testKey.public })
        req.end()
    })
})