import { pki } from 'node-forge';
interface certpair {
    key: pki.PrivateKey;
    cert: pki.Certificate;
}
export declare function loadPairSync(keyfile: string, certfile: string): certpair;
interface createCertOptions {
    caKey: pki.PrivateKey;
    caCert: pki.Certificate;
}
export declare function createCert(domain: string, opts: createCertOptions): certpair;
export {};
