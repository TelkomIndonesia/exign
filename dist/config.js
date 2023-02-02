"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitConfig = exports.downloadRemoteConfigs = exports.generatePKIs = exports.newAppConfig = void 0;
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
const simple_git_1 = require("simple-git");
const sshpk_1 = require("sshpk");
const configDir = process.env.EXIGN_CONFIG_DIRECTORY || 'config';
const remoteConfig = {
    url: process.env.EXIGN_REMOTE_CONFIG_URL,
    secure: process.env.EXIGN_REMOTE_CONFIG_SECURE || 'true'
};
dotenv_1.default.config({ path: (0, path_1.resolve)(configDir, '.env') });
const config = {
    digest: {
        memBufferSize: process.env.EXIGN_DIGEST_MEMORY_BUFFER_SIZE || '8192',
        fileBufferPoolMin: process.env.EXIGN_DIGEST_FILE_BUFFER_POOL_MIN || '8',
        fileBufferPoolMax: process.env.EXIGN_DIGEST_FILE_BUFFER_POOL_MAX || '1024'
    },
    upstreams: {
        hostmap: process.env.EXIGN_UPSTREAMS_HOSTMAP || '',
        doubleDashDomains: process.env.EXIGN_UPSTREAMS_DOUBLEDASH_DOMAINS || '',
        secure: process.env.EXIGN_UPSTREAMS_SECURE || 'true'
    },
    signature: {
        keyfile: (0, path_1.resolve)(configDir, 'signature/key.pem'),
        pubkeyfile: (0, path_1.resolve)(configDir, 'signature/pubkey.pem')
    },
    transport: {
        caKeyfile: (0, path_1.resolve)(configDir, 'transport/ca-key.pem'),
        caCertfile: (0, path_1.resolve)(configDir, 'transport/ca.crt')
    },
    logdb: {
        directory: process.env.EXIGN_LOGDB_DIRECTORY || 'logs'
    },
    dns: {
        resolver: process.env.EXIGN_DNS_RESOLVER || '1.1.1.1',
        advertisedAddres: process.env.EXIGN_DNS_ADVERTISED_ADDRESS || '0.0.0.0'
    },
    verification: {
        keys: process.env.EXIGN_VERIFICATION_KEYS
    }
};
function hostmap(str) {
    const map = new Map();
    if (!str) {
        return map;
    }
    return str.split(',')
        .reduce((map, str) => {
        const [host, targethost] = str.trim().split(':');
        map.set(host, targethost || host);
        return map;
    }, map);
}
function doubleDashDomains(str) {
    if (!str) {
        return [];
    }
    return str
        .split(',')
        .map(v => v.trim());
}
function file(name) {
    return (0, fs_1.readFileSync)(name, 'utf-8');
}
function publicKeys(str) {
    return str.split(',').reduce((m, v) => {
        const fp = (0, sshpk_1.parseKey)(v).fingerprint('sha256').toString();
        m.set(fp, v);
        return m;
    }, new Map());
}
function newAppConfig() {
    return {
        digest: {
            memBufferSize: parseInt(config.digest.memBufferSize),
            fileBufferPoolMin: parseInt(config.digest.fileBufferPoolMin),
            fileBufferPoolMax: parseInt(config.digest.fileBufferPoolMax)
        },
        upstreams: {
            hostmap: hostmap(config.upstreams.hostmap),
            doubleDashDomains: doubleDashDomains(config.upstreams.doubleDashDomains),
            secure: config.upstreams.secure === 'true'
        },
        signature: {
            key: file(config.signature.keyfile),
            pubkey: file(config.signature.pubkeyfile)
        },
        transport: {
            caKey: file(config.transport.caKeyfile),
            caCert: file(config.transport.caCertfile)
        },
        logdb: config.logdb,
        dns: config.dns,
        verification: config.verification.keys
            ? { keys: publicKeys(config.verification.keys) }
            : undefined
    };
}
exports.newAppConfig = newAppConfig;
async function writeFilesIfNotExist(...files) {
    try {
        await Promise.all(files.map(v => (0, promises_1.mkdir)((0, path_1.dirname)(v[0]), { recursive: true })));
        const handles = await Promise.all(files.map(v => (0, promises_1.open)(v[0], 'wx')));
        for (let i = 0; i < handles.length; i++) {
            await handles[i].write(files[i][1]);
            await handles[i].close();
        }
        return true;
    }
    catch (err) {
        if (!(typeof err === 'object' && err && 'code' in err && err.code === 'EEXIST')) {
            throw err;
        }
        return false;
    }
}
async function generatePKIs(opts) {
    opts = opts || config;
    {
        const { key, publicKey } = (0, pki_1.newECDSAPair)();
        const created = await writeFilesIfNotExist([opts.signature.keyfile, key.toString('pkcs8')], [opts.signature.pubkeyfile, publicKey.toString('pkcs8')]);
        created ? console.log('[INFO] Signature keys created') : console.log('[INFO] Signature keys exists');
    }
    {
        const { key, cert } = (0, pki_1.newX509Pair)('exign.non');
        const created = await writeFilesIfNotExist([opts.transport.caKeyfile, node_forge_1.pki.privateKeyToPem(key)], [opts.transport.caCertfile, node_forge_1.pki.certificateToPem(cert)]);
        created ? console.log('[INFO] Transport keys created') : console.log('[INFO] Transport keys exists');
    }
}
exports.generatePKIs = generatePKIs;
async function downloadIfExists(url, location, opts) {
    await (0, promises_1.mkdir)((0, path_1.dirname)(location), { recursive: true });
    const request = url.protocol === 'http:' ? http_1.request : https_1.request;
    const agent = url.protocol === 'https:' && opts?.secure !== true ? new https_1.Agent({ rejectUnauthorized: false }) : undefined;
    const req = request(url, { agent });
    if (opts?.signature) {
        req.setHeader('digest', await (0, digest_1.digest)(stream_1.Readable.from([], { objectMode: false })));
        (0, signature_1.sign)(req, opts.signature);
    }
    const res = await new Promise((resolve, reject) => req.on('response', resolve).on('error', reject).end());
    if (res.statusCode !== 200 && res.statusCode !== 404) {
        throw new Error(`unexpected status code: ${res.statusCode}`);
    }
    if (res.statusCode === 404) {
        return false;
    }
    await (0, promises_2.pipeline)(res, (0, fs_1.createWriteStream)(location));
    return true;
}
async function downloadRemoteConfigs(opts) {
    const url = opts?.url || remoteConfig.url;
    if (!url) {
        return;
    }
    const secure = opts?.secure || remoteConfig.secure === 'true';
    let signature = opts?.signature;
    if (!opts) {
        signature = {
            key: await (0, promises_1.readFile)(config.signature.keyfile, 'utf-8'),
            pubkey: await (0, promises_1.readFile)(config.signature.pubkeyfile, 'utf-8')
        };
    }
    const directory = opts?.directory || configDir;
    const configNames = ['.env', 'hosts', 'upstream-transport/ca.crt'];
    for (const name of configNames) {
        while (true) {
            try {
                const dowloaded = await downloadIfExists(new URL(name, url), (0, path_1.resolve)(directory, name), { signature, secure });
                dowloaded && console.log(`[INFO] Remote configs '${name}' downloaded`);
                break;
            }
            catch (err) {
                if (err instanceof Error) {
                    console.error(`[WARN] Download '${name}' failed (${err.message}). Make sure your public key has been whitelisted at the remote server. Retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    }
}
exports.downloadRemoteConfigs = downloadRemoteConfigs;
async function commitConfig() {
    const git = (0, simple_git_1.simpleGit)({
        baseDir: configDir,
        config: ['user.name=exign', "user.email='<>'"]
    });
    try {
        await git.init();
        await git.add('.');
        const diff = await git.diffSummary(['--cached']);
        if (diff.files.length === 0) {
            return;
        }
        await git.commit('config updated', ['-a']);
    }
    catch (err) {
        console.log('[WARN] Cannot commit config:', err);
    }
}
exports.commitConfig = commitConfig;
//# sourceMappingURL=config.js.map