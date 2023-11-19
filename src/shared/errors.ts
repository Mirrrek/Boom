export class DeserializeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DeserializeError';
    }
}

export class ProtocolError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProtocolError';
    }
}
