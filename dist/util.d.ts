export declare function tmpFilename(): {
    filepath: string;
    cleanup: () => Promise<void>;
};
