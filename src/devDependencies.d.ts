/// <reference types="node" />
declare module 'wav' {
    export class Writer {
        constructor(options?: {
            channels?: number;
            sampleRate?: number;
            bitDepth?: number;
        });
        on(event: 'error', cb: (err: Error) => void): this;
        on(event: 'data', cb: (chunk: Buffer) => void): this;
        on(event: 'end', cb: () => void): this;
        write(data: Buffer): void;
        end(): void;
    }
}
