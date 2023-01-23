export declare function newAppConfig(): {
    digest: {
        memBufferSize: number;
        fileBufferPoolMin: number;
        fileBufferPoolMax: number;
    };
    upstreams: {
        hostmap: Map<string, string>;
        doubleDashDomains: string[];
        secure: boolean;
    };
    signature: {
        key: string;
        pubkey: string;
    };
    transport: {
        caKey: string;
        caCert: string;
    };
    logdb: {
        directory: string;
    };
    dns: {
        resolver: string;
        advertisedAddres: string;
    };
    verification: {
        keys: Map<string, string>;
    } | undefined;
};
interface generatePKIsOptions {
    signature: {
        keyfile: string;
        pubkeyfile: string;
    };
    transport: {
        caKeyfile: string;
        caCertfile: string;
    };
}
export declare function generatePKIs(opts?: generatePKIsOptions): Promise<void>;
interface downloadRemoteConfigsOptions {
    url: string;
    directory: string;
    secure?: boolean;
    signature?: {
        key: string;
        pubkey: string;
    };
}
export declare function downloadRemoteConfigs(opts?: downloadRemoteConfigsOptions): Promise<void>;
export declare function commitConfig(): Promise<void>;
export {};
