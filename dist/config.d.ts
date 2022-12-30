export declare const config: {
    clientBodyBufferSize: number;
    hostmap: Map<string, string>;
    doubleDashDomains: string[];
    secure: boolean;
    signature: {
        keyfile: string;
        pubkeyfile: string;
    };
    transport: {
        caKeyfile: string;
        caCertfile: string;
    };
    logdb: {
        directory: string;
    };
};
