import { SERVER_URL } from '@shared/constants';
import Connection from '@shared/connection';
import { login, play } from '@client/game';
import popup from '@client/popup';
import log from '@shared/log';

window.addEventListener('DOMContentLoaded', async () => {
    log('INFO', 'Connecting to server');

    const client = new Connection(new WebSocket(SERVER_URL));
    client.websocket.binaryType = 'arraybuffer';

    client.websocket.addEventListener('error', () => {
        popup('Failed to connect to server, please try reloading the page.');
    });

    await new Promise((resolve) => {
        client.websocket.addEventListener('open', resolve);
    });

    const { playerID, players } = await login(client);

    log('INFO', `Starting game with player ID ${playerID}`);

    await play(client, { playerID, players: players.map((player) => ({ ...player, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0 } })) });

    log('INFO', 'Game ended');
});

window.addEventListener('error', (event) => {
    popup('An unexpected error occurred, please try reloading the page.');
});

window.addEventListener('unhandledrejection', (event) => {
    popup('An unexpected error occurred, please try reloading the page.');
});
