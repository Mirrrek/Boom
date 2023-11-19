import { DeserializeError } from '@shared/errors';
import Bytes from '@shared/bytes';

interface IDataType<T> {
    serialize(buffer: Bytes, value: T): void;
    deserialize(buffer: Bytes): T;
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
}

export interface IPacket<T extends any[]> {
    readonly code: number;
    readonly name: string;
    serialize(...data: T): ArrayBuffer;
    deserialize(buffer: Bytes): T;
}

// enum PacketType {
//     // Ping
//     SB_REQ_PING = 0x00,                     // uint32 random
//     CB_RES_PONG = 0x01,                     // uint32 echo
//     // Authentication
//     SB_REQ_AUTHENTICATE = 0x10,             // string username (max 32 chars), string googleToken
//     CB_RES_AUTHENTICATED = 0x11,             // uint8 playerID
//     // Player management
//     CB_EVT_ADD_PLAYER = 0x20,               // Player player
//     CB_EVT_REMOVE_PLAYER = 0x21,            // uint8 playerID
//     // Actions
//     SB_EVT_PLAYER_MOVE = 0x30,              // float32 posX, float32 posY, float32 posZ, float32 rotX, float32 rotY
//     SB_EVT_PLAYER_SHOOT = 0x31,             // -
//     CB_EVT_PLAYER_MOVE = 0x32,              // uint8 playerID, float32 posX, float32 posY, float32 posZ, float32 rotX, float32 rotY
//     CB_EVT_PLAYER_SHOOT = 0x33,             // uint8 playerID
//     // Chat
//     SB_REQ_CHAT_MESSAGE = 0x40,             // string message (max 128 chars)
//     CB_EVT_CHAT_MESSAGE = 0x41,             // uint8 playerID, string message (max 128 chars)
//     CB_EVT_CHAT_EVENT = 0x42,               // string message (max 128 chars)
//     // Error
//     CB_ERROR_INVALID_PACKET = 0xf0,         // -
//     CB_ERROR_INVALID_STATE = 0xf1           // -
//     CB_ERROR_AUTHENTICATION_FAILED = 0xf2,  // -
// }

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

export const CB_RES_AUTHENTICATED: IPacket<[number]> = {
    code: 0x11,
    name: 'Authentication Response',
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
