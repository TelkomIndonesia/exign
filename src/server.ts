import app from "./express"
import http from "http"
import https from "https"
import tls from "tls"
import { createCert, loadPairSync } from "./certificate"
import { pki } from "node-forge"
import config from "./config"

const { key: caKey, cert: caCert } = loadPairSync(config.transport.caKeyfile, config.transport.caCertfile)
const { key: localhostKey, cert: localhostCert } = createCert("localhost", { caKey, caCert })

http.createServer(app).
    listen(80, () => console.log('HTTP Server running on port 80'));

https.createServer({
    SNICallback: (domain, cb) => {
        const { key, cert } = createCert(domain, { caKey, caCert })
        cb(null, tls.createSecureContext({
            key: pki.privateKeyToPem(key),
            cert: pki.certificateToPem(cert),
            ca: pki.certificateToPem(caCert),
        }).context)
    },
    key: pki.privateKeyToPem(localhostKey),
    cert: pki.certificateToPem(localhostCert),
    ca: pki.certificateToPem(caCert)
}, app).
    listen(443, () => console.log('HTTPS Server running on port 443'));