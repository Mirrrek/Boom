import log from '@shared/log';
import cors from '@server/cors';
import Connection from '@shared/connection';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

export default class Server {
    private wss: WebSocketServer;

    public constructor(connectionCallback: (connection: Connection) => void) {
        const server = createServer();

        server.on('request', cors);

        server.listen(443, () => {
            log('INFO', 'Server listening on port 443');
        });

        this.wss = new WebSocketServer({ server });

        this.wss.on('connection', (websocket: WebSocket, req) => {
            websocket.binaryType = 'arraybuffer';
            const connection = new Connection(websocket, req.socket.remoteAddress);
            connectionCallback(connection);
        });
    }
}
