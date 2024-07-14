import { DeserializeError } from '@shared/errors';
import Bytes from '@shared/bytes';

type SerializablePrimitive = boolean | number | string;
type SerializableObject<T extends { [key: string]: SerializablePrimitive }> = {
    [K in keyof T]: T[K];
}
type Serializable = SerializablePrimitive | SerializableObject<any>[];

interface IDataType<T extends Serializable> {
    serialize(buffer: Bytes, value: T): void;
    deserialize(buffer: Bytes): T;
}

type ObjectSerializers<T extends SerializableObject<any>> = {
    [K in keyof T]: IDataType<T[K]>;
}

namespace DataTypes {
    export const BOOL: IDataType<boolean> = {
        serialize(buffer: Bytes, value: boolean): void {
            buffer.writeUint8(value ? 1 : 0);
        },
        deserialize(buffer: Bytes): boolean {
            return buffer.readUint8() !== 0;
        }
    }

    export const UINT8: IDataType<number> = {
        serialize(buffer: Bytes, value: number): void {
            buffer.writeUint8(value);
        },
        deserialize(buffer: Bytes): number {
            return buffer.readUint8();
        }
    }

    export const UINT16: IDataType<number> = {
        serialize(buffer: Bytes, value: number): void {
            buffer.writeUint16(value);
        },
        deserialize(buffer: Bytes): number {
            return buffer.readUint16();
        }
    }

    export const UINT32: IDataType<number> = {
        serialize(buffer: Bytes, value: number): void {
            buffer.writeUint32(value);
        },
        deserialize(buffer: Bytes): number {
            return buffer.readUint32();
        }
    }

    export const FLOAT32: IDataType<number> = {
        serialize(buffer: Bytes, value: number): void {
            buffer.writeFloat32(value);
        },
        deserialize(buffer: Bytes): number {
            return buffer.readFloat32();
        }
    }

    export const STRING: IDataType<string> = {
        serialize(buffer: Bytes, value: string): void {
            const data = new TextEncoder().encode(value).buffer;
            if (data.byteLength > 0xffff) {
                throw new DeserializeError(`String is too long`);
            }
            buffer.writeUint16(data.byteLength);
            buffer.writeRaw(data);
        },
        deserialize(buffer: Bytes): string {
            const length = buffer.readUint16();
            const data = buffer.readRaw(length);
            return new TextDecoder().decode(data);
        }
    }

    export function ARRAY<T extends SerializableObject<any>>(serializers: ObjectSerializers<T>): IDataType<T[]> {
        return {
            serialize(buffer: Bytes, data: T[]): void {
                buffer.writeUint16(data.length);
                data.forEach((entry) => {
                    for (const key in serializers) {
                        serializers[key].serialize(buffer, entry[key]);
                    }
                });
            },
            deserialize(buffer: Bytes): T[] {
                const length = buffer.readUint16();
                const result: T[] = [];
                for (let i = 0; i < length; i++) {
                    const entry: SerializableObject<any> = {};
                    for (const key in serializers) {
                        entry[key] = serializers[key].deserialize(buffer);
                    }
                }
                return result;
            }
        }
    }
}

export interface IPacket<T extends Serializable[]> {
    readonly code: number;
    readonly name: string;
    serialize(...data: T): ArrayBuffer;
    deserialize(buffer: Bytes): T;
}

export const SB_REQ_PING: IPacket<[number]> = {
    code: 0x00,
    name: 'Ping Request',
    serialize(random: number): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 4));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.UINT32.serialize(buffer, random);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [number] {
        return [DataTypes.UINT32.deserialize(bytes)];
    }
}

export const CB_RES_PONG: IPacket<[number]> = {
    code: 0x01,
    name: 'Pong Response',
    serialize(echo: number): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 4));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.UINT32.serialize(buffer, echo);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [number] {
        return [DataTypes.UINT32.deserialize(bytes)];
    }
}

export const SB_REQ_AUTHENTICATE: IPacket<[string, string]> = {
    code: 0x10,
    name: 'Authentication Request',
    serialize(username: string, googleToken: string): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 2 + utf8StringLength(username) + 2 + utf8StringLength(googleToken)));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.STRING.serialize(buffer, username);
        DataTypes.STRING.serialize(buffer, googleToken);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [string, string] {
        return [DataTypes.STRING.deserialize(bytes), DataTypes.STRING.deserialize(bytes)];
    }
}

export const CB_RES_AUTHENTICATED: IPacket<[number, { playerID: number, username: string }[]]> = {
    code: 0x11,
    name: 'Authentication Response',
    serialize(playerID: number, players: { playerID: number, username: string }[]): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 1 + 2 + players.map(p => 1 + 2 + utf8StringLength(p.username)).reduce((a, b) => a + b, 0)));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.UINT8.serialize(buffer, playerID);
        DataTypes.ARRAY({ playerID: DataTypes.UINT8, username: DataTypes.STRING }).serialize(buffer, players);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [number, { playerID: number, username: string }[]] {
        return [DataTypes.UINT8.deserialize(bytes), DataTypes.ARRAY({ playerID: DataTypes.UINT8, username: DataTypes.STRING }).deserialize(bytes)];
    }
}

export const CB_EVT_ADD_PLAYER: IPacket<[number, string]> = {
    code: 0x20,
    name: 'Add Player Event',
    serialize(playerID: number, username: string): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 1 + 2 + utf8StringLength(username)));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.UINT8.serialize(buffer, playerID);
        DataTypes.STRING.serialize(buffer, username);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [number, string] {
        return [DataTypes.UINT8.deserialize(bytes), DataTypes.STRING.deserialize(bytes)];
    }
}

export const CB_EVT_REMOVE_PLAYER: IPacket<[number]> = {
    code: 0x21,
    name: 'Remove Player Event',
    serialize(playerID: number): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 1));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.UINT8.serialize(buffer, playerID);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [number] {
        return [DataTypes.UINT8.deserialize(bytes)];
    }
}

export const SB_EVT_PLAYER_MOVE: IPacket<[number, number, number, number, number]> = {
    code: 0x30,
    name: 'Player Move Event',
    serialize(posX: number, posY: number, posZ: number, rotX: number, rotY: number): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 4 * 5));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.FLOAT32.serialize(buffer, posX);
        DataTypes.FLOAT32.serialize(buffer, posY);
        DataTypes.FLOAT32.serialize(buffer, posZ);
        DataTypes.FLOAT32.serialize(buffer, rotX);
        DataTypes.FLOAT32.serialize(buffer, rotY);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [number, number, number, number, number] {
        return [DataTypes.FLOAT32.deserialize(bytes), DataTypes.FLOAT32.deserialize(bytes), DataTypes.FLOAT32.deserialize(bytes),
        DataTypes.FLOAT32.deserialize(bytes), DataTypes.FLOAT32.deserialize(bytes)];
    }
}

export const SB_EVT_PLAYER_SHOOT: IPacket<[]> = {
    code: 0x31,
    name: 'Player Shoot Event',
    serialize(): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1));
        DataTypes.UINT8.serialize(buffer, this.code);
        return buffer.getBuffer();
    },
    deserialize(): [] {
        return [];
    }
}

export const CB_EVT_PLAYER_MOVE: IPacket<[number, number, number, number, number, number]> = {
    code: 0x32,
    name: 'Player Move Event',
    serialize(playerID: number, posX: number, posY: number, posZ: number, rotX: number, rotY: number): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 1 + 4 * 5));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.UINT8.serialize(buffer, playerID);
        DataTypes.FLOAT32.serialize(buffer, posX);
        DataTypes.FLOAT32.serialize(buffer, posY);
        DataTypes.FLOAT32.serialize(buffer, posZ);
        DataTypes.FLOAT32.serialize(buffer, rotX);
        DataTypes.FLOAT32.serialize(buffer, rotY);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [number, number, number, number, number, number] {
        return [DataTypes.UINT8.deserialize(bytes), DataTypes.FLOAT32.deserialize(bytes), DataTypes.FLOAT32.deserialize(bytes), DataTypes.FLOAT32.deserialize(bytes),
        DataTypes.FLOAT32.deserialize(bytes), DataTypes.FLOAT32.deserialize(bytes)];
    }
}

export const CB_EVT_PLAYER_SHOOT: IPacket<[number]> = {
    code: 0x33,
    name: 'Player Shoot Event',
    serialize(playerID: number): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 1));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.UINT8.serialize(buffer, playerID);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [number] {
        return [DataTypes.UINT8.deserialize(bytes)];
    }
}

export const SB_REQ_CHAT_MESSAGE: IPacket<[string]> = {
    code: 0x40,
    name: 'Chat Message Request',
    serialize(text: string): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 2 + utf8StringLength(text)));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.STRING.serialize(buffer, text);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [string] {
        return [DataTypes.STRING.deserialize(bytes)];
    }
}

export const CB_EVT_CHAT_MESSAGE: IPacket<[{ color: number, bold: boolean, text: string }[]]> = {
    code: 0x41,
    name: 'Chat Message Event',
    serialize(chunks: { color: number, bold: boolean, text: string }[]): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1 + 2 + chunks.map(c => 1 + 1 + 2 + utf8StringLength(c.text)).reduce((a, b) => a + b, 0)));
        DataTypes.UINT8.serialize(buffer, this.code);
        DataTypes.ARRAY({ color: DataTypes.UINT8, bold: DataTypes.BOOL, text: DataTypes.STRING }).serialize(buffer, chunks);
        return buffer.getBuffer();
    },
    deserialize(bytes: Bytes): [{ color: number, bold: boolean, text: string }[]] {
        return [DataTypes.ARRAY({ color: DataTypes.UINT8, bold: DataTypes.BOOL, text: DataTypes.STRING }).deserialize(bytes)];
    }
}

export const CB_ERROR_INVALID_PACKET: IPacket<[]> = {
    code: 0xf0,
    name: 'Invalid Packet Error',
    serialize(): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1));
        DataTypes.UINT8.serialize(buffer, this.code);
        return buffer.getBuffer();
    },
    deserialize(): [] {
        return [];
    }
}

export const CB_ERROR_INVALID_STATE: IPacket<[]> = {
    code: 0xf1,
    name: 'Invalid State Error',
    serialize(): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1));
        DataTypes.UINT8.serialize(buffer, this.code);
        return buffer.getBuffer();
    },
    deserialize(): [] {
        return [];
    }
}

export const CB_ERROR_AUTHENTICATION_FAILED: IPacket<[]> = {
    code: 0xf2,
    name: 'Authentication Failed Error',
    serialize(): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1));
        DataTypes.UINT8.serialize(buffer, this.code);
        return buffer.getBuffer();
    },
    deserialize(): [] {
        return [];
    }
}

export const CB_ERROR_UNEXPECTED: IPacket<[]> = {
    code: 0xff,
    name: 'Unexpected Error',
    serialize(): ArrayBuffer {
        const buffer = new Bytes(new ArrayBuffer(1));
        DataTypes.UINT8.serialize(buffer, this.code);
        return buffer.getBuffer();
    },
    deserialize(): [] {
        return [];
    }
}

function utf8StringLength(string: string): number {
    return new TextEncoder().encode(string).byteLength;
}
