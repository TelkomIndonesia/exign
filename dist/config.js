"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadRemoteConfigs = exports.generatePKIs = exports.newAppConfig = void 0;
const tslib_1 = require("tslib");
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const node_forge_1 = require("node-forge");
const path_1 = require("path");
const pki_1 = require("./pki");
const http_1 = require("http");
const https_1 = require("https");
const promises_2 = require("stream/promises");
const signature_1 = require("./signature");
const digest_1 = require("./digest");
const stream_1 = require("stream");
const remoteConfig = {
    url: process.env.FRPROXY_REMOTE_CONFIG_URL,
    directory: process.env.FRPROXY_REMOTE_CONFIG_DIRECTORY || './config'
};
dotenv_1.default.config({ path: (0, path_1.resolve)(remoteConfig.directory, '.env') });
const config = {
    clientBodyBufferSize: process.env.FRPROXY_CLIENT_BODY_BUFFER_SIZE || '8192',
    hostmap: process.env.FRPROXY_HOSTMAP || '',
    doubleDashDomains: process.env.FRPROXY_DOUBLEDASH_DOMAINS || '',
    secure: process.env.FRPROXY_PROXY_SECURE || 'true',
    signature: {
        keyfile: process.env.FRPROXY_SIGNATURE_KEYFILE || './config/signature/key.pem',
        pubkeyfile: process.env.FRPROXY_SIGNATURE_PUBKEYFILE || './config/signature/pubkey.pem'
    },
    transport: {
        caKeyfile: process.env.FRPROXY_TRANSPORT_CA_KEYFILE || './config/transport/ca-key.pem',
        caCertfile: process.env.FRPROXY_TRANSPORT_CA_CERTFILE || './config/transport/ca.crt'
    },
    logdb: {
        directory: process.env.FRPROXY_LOGDB_DIRECTORY || './logs'
    },
    dns: {
        resolver: process.env.FRPROXY_DNS_RESOLVER || '1.1.1.1'
    }
};
function hostmap(str) {
    const map = new Map();
    return str.split(',')
        .reduce((map, str) => {
        const [host, targethost] = str.trim().split(':');
        map.set(host, targethost);
        return map;
    }, map);
}
function doubleDashDomains(str) {
    return (str === null || str === void 0 ? void 0 : str.split(',').map(v => v.trim())) || [];
}
function file(name) {
    return (0, fs_1.readFileSync)(name, 'utf-8');
}
function dir(name) {
    (0, fs_1.mkdirSync)(name, { recursive: true });
    return name;
}
function newAppConfig() {
    return {
        clientBodyBufferSize: parseInt(config.clientBodyBufferSize),
        hostmap: hostmap(config.hostmap),
        doubleDashDomains: doubleDashDomains(config.doubleDashDomains),
        secure: config.secure === 'true',
        signature: {
            key: file(config.signature.keyfile),
            pubkey: file(config.signature.pubkeyfile)
        },
        transport: {
            caKey: file(config.transport.caKeyfile),
            caCertfile: file(config.transport.caCertfile)
        },
        logdb: {
            directory: dir(config.logdb.directory)
        },
        dns: config.dns
    };
}
exports.newAppConfig = newAppConfig;
function writeFilesIfNotExist(...files) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            yield Promise.all(files.map(v => (0, promises_1.mkdir)((0, path_1.dirname)(v[0]), { recursive: true })));
            const handles = yield Promise.all(files.map(v => (0, promises_1.open)(v[0], 'wx')));
            for (let i = 0; i < handles.length; i++) {
                yield handles[i].write(files[i][1]);
                yield handles[i].close();
            }
            return true;
        }
        catch (err) {
            if (!(typeof err === 'object' && err && 'code' in err && err.code === 'EEXIST')) {
                throw err;
            }
            return false;
        }
    });
}
function generatePKIs(opts) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        opts = opts || config;
        {
            const { key, publicKey } = (0, pki_1.newECDSAPair)();
            const created = yield writeFilesIfNotExist([opts.signature.keyfile, key.toString('pkcs8')], [opts.signature.pubkeyfile, publicKey.toString('pkcs8')]);
            created ? console.log('[INFO] Signature keys created') : console.log('[INFO] Signature keys exists');
        }
        {
            const { key, cert } = (0, pki_1.newX509Pair)('httpsig-frproxy.non');
            const created = yield writeFilesIfNotExist([opts.transport.caKeyfile, node_forge_1.pki.privateKeyToPem(key)], [opts.transport.caCertfile, node_forge_1.pki.certificateToPem(cert)]);
            created ? console.log('[INFO] Transport keys created') : console.log('[INFO] Transport keys exists');
        }
    });
}
exports.generatePKIs = generatePKIs;
function downloadIfExists(url, location, opts) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield (0, promises_1.mkdir)((0, path_1.dirname)(location), { recursive: true });
        const request = url.protocol === 'http' ? http_1.request : https_1.request;
        const req = request(url);
        if (opts === null || opts === void 0 ? void 0 : opts.signature) {
            req.setHeader('digest', yield (0, digest_1.digest)(stream_1.Readable.from([], { objectMode: false })));
            (0, signature_1.sign)(req, opts.signature);
        }
        const res = yield new Promise((resolve, reject) => req.on('response', resolve).on('error', reject).end());
        if (res.statusCode !== 200 && res.statusCode !== 404) {
            throw new Error(`unexpected status code: ${res.statusCode}`);
        }
        if (res.statusCode === 404) {
            return false;
        }
        yield (0, promises_2.pipeline)(res, (0, fs_1.createWriteStream)(location));
        return true;
    });
}
function downloadRemoteConfigs(opts) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const url = (opts === null || opts === void 0 ? void 0 : opts.url) || remoteConfig.url;
        if (!url) {
            return;
        }
        const directory = (opts === null || opts === void 0 ? void 0 : opts.directory) || remoteConfig.directory;
        let signature = opts === null || opts === void 0 ? void 0 : opts.signature;
        if (!opts) {
            signature = {
                key: yield (0, promises_1.readFile)(config.signature.keyfile, 'utf-8'),
                pubkey: yield (0, promises_1.readFile)(config.signature.pubkeyfile, 'utf-8')
            };
        }
        const configNames = ['.env', 'hosts', 'backend-transport/ca.crt'];
        for (const name of configNames) {
            while (true) {
                try {
                    yield downloadIfExists(new URL(name, url), (0, path_1.resolve)(directory, name), { signature });
                    console.log(`[INFO] Remote configs '${name}' downloaded`);
                    break;
                }
                catch (err) {
                    if (err instanceof Error) {
                        console.error(`[WARN] Download '${name}' failed (${err.message}). Make sure your public key has been whitelisted at the remote server. Retrying...`);
                        yield new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
        }
    });
}
exports.downloadRemoteConfigs = downloadRemoteConfigs;
//# sourceMappingURL=config.js.map