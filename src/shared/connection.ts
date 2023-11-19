import { IPacket } from '@shared/packets';
import Bytes from '@shared/bytes';

class PacketHandlers {
    private handlers: { id: number, code: number, handler: (bytes: Bytes) => void }[];
    
    public constructor() {
        this.handlers = [];
    }

    public add(code: number, handler: (bytes: Bytes) => void): number {
        const id = Math.floor(Math.random() * 0xffffffff);
        this.handlers.push({ id, code, handler });
        return id;
    }

    public remove(id: number) {
        this.handlers = this.handlers.filter(handler => handler.id !== id);
    }

    public has(id: number): boolean {
        return this.handlers.some(handler => handler.id === id);
    }

    public emit(code: number, bytes: Bytes) {
        this.handlers.forEach(handler => {
            if (handler.code === code) {
                handler.handler(bytes);
            }
        });
    }
}

export default class Connection {
    private socket: WebSocket;
    private packetHandlers: PacketHandlers;
    private remoteAddress: string | null;

    public constructor(socket: WebSocket, remoteAddress: string | null = null) {
        this.socket = socket;
        this.remoteAddress = remoteAddress;

        this.packetHandlers = new PacketHandlers();

        this.socket.addEventListener('message', (data) => {
            const bytes = new Bytes(data.data);
            const packetId = bytes.readUint8();
            this.packetHandlers.emit(packetId, bytes);
        });
    }

    public send<T extends any[]>(packet: IPacket<T>, ...data: T) {
        this.socket.send(packet.serialize(...data));
    }

    public awaitPacket<T extends any[]>(packet: IPacket<T>, timeout: number = 10000): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeoutID = setTimeout(() => {
                if (this.packetHandlers.has(handlerID)) {
                    this.packetHandlers.remove(handlerID);
                    reject(new Error(`Timed out waiting for "${packet.name}" packet`));
                }
            }, timeout);
            const handlerID = this.packetHandlers.add(packet.code, (bytes: Bytes) => {
                clearTimeout(timeoutID);
                resolve(packet.deserialize(bytes));
            });
        });
    }

    public onPacket<T extends any[]>(packet: IPacket<T>, callback: (...data: T) => boolean | void | Promise<boolean | void>) {
        const handlerID = this.packetHandlers.add(packet.code, async (bytes: Bytes) => {
            const result = callback(...packet.deserialize(bytes));
            if ((result instanceof Promise ? await result : result) === false) {
                this.packetHandlers.remove(handlerID);
            }
        });
    }

    get websocket(): WebSocket {
        return this.socket;
    }

    get ip(): string | null {
        return this.remoteAddress;
    }
} 
