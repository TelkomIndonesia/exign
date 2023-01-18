export declare function newAppConfig(): {
    clientBodyBufferSize: number;
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
    signature?: {
        key: string;
        pubkey: string;
    };
}
export declare function downloadRemoteConfigs(opts?: downloadRemoteConfigsOptions): Promise<void>;
export {};
