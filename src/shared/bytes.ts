import { DeserializeError } from '@shared/errors';

export default class Bytes {
    private offset: number;
    private buffer: DataView;

    public constructor(buffer: ArrayBuffer) {
        this.buffer = new DataView(buffer);
        this.offset = 0;
    }

    public getBuffer(): ArrayBuffer {
        return this.buffer.buffer;
    }

    public getOffset(): number {
        return this.offset;
    }

    public setOffset(offset: number): void {
        if (offset < 0 || offset > this.buffer.byteLength) {
            throw new DeserializeError(`Offset ${offset} is out of bounds`);
        }

        this.offset = offset;
    }

    public readUint8(): number {
        if (this.offset + 1 > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        const value = this.buffer.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    public readUint16(): number {
        if (this.offset + 2 > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        const value = this.buffer.getUint16(this.offset);
        this.offset += 2;
        return value;
    }

    public readUint32(): number {
        if (this.offset + 4 > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        const value = this.buffer.getUint32(this.offset);
        this.offset += 4;
        return value;
    }

    public readFloat32(): number {
        if (this.offset + 4 > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        const value = this.buffer.getFloat32(this.offset);
        this.offset += 4;
        return value;
    }

    public readRaw(length: number): ArrayBuffer {
        if (this.offset + length > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        const value = this.buffer.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return value;
    }

    public writeUint8(value: number): void {
        if (this.offset + 1 > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        this.buffer.setUint8(this.offset, value);
        this.offset += 1;
    }

    public writeUint16(value: number): void {
        if (this.offset + 2 > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        this.buffer.setUint16(this.offset, value);
        this.offset += 2;
    }

    public writeUint32(value: number): void {
        if (this.offset + 4 > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        this.buffer.setUint32(this.offset, value);
        this.offset += 4;
    }

    public writeFloat32(value: number): void {
        if (this.offset + 4 > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        this.buffer.setFloat32(this.offset, value);
        this.offset += 4;
    }

    public writeRaw(value: ArrayBuffer): void {
        const dataView = new DataView(value);

        if (this.offset + dataView.byteLength > this.buffer.byteLength) {
            throw new DeserializeError(`End of buffer reached`);
        }

        for (let i = 0; i < dataView.byteLength; i++) {
            this.buffer.setUint8(this.offset + i, dataView.getUint8(i));
        }
        this.offset += dataView.byteLength;
    }
}
