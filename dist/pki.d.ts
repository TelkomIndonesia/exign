import { pki } from 'node-forge';
interface x509Pair {
    key: pki.PrivateKey;
    cert: pki.Certificate;
}
export declare function loadX509Pair(keyPem: string, certPem: string): x509Pair;
interface createCertOptions {
    caKey?: pki.PrivateKey;
    caCert?: pki.Certificate;
}
export declare function newX509Pair(domain: string, opts?: createCertOptions): x509Pair;
export declare function newECDSAPair(): {
    key: import("sshpk").PrivateKey;
    publicKey: import("sshpk").Key;
};
export {};
