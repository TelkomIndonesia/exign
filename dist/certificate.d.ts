import { pki } from 'node-forge';
interface CertPair {
    key: pki.PrivateKey;
    cert: pki.Certificate;
}
export declare function loadCertPairSync(keyPem: string, certPem: string): CertPair;
interface createCertOptions {
    caKey: pki.PrivateKey;
    caCert: pki.Certificate;
}
export declare function createCertPair(domain: string, opts: createCertOptions): CertPair;
export {};
