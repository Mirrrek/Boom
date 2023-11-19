import { SERVER_URL } from '@shared/constants';
import { ProtocolError } from '@shared/errors';
import LoginScreen from '@client/loginScreen';
import Connection from '@shared/connection';
import * as packets from '@shared/packets';
import popup from '@client/popup';
import log from '@shared/log';

declare const google: any;

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

    const playerID = await login(client);

    log('INFO', `Starting game with player ID ${playerID}`);

    // TODO: Start game
});

function login(connection: Connection): Promise<number> {
    return new Promise(async (resolve) => {
        const loginScreen = new LoginScreen();

        const random = Math.floor(Math.random() * 0xffffffff);
        connection.send(packets.SB_REQ_PING, random);
        const [echo] = await connection.awaitPacket(packets.CB_RES_PONG);

        if (echo !== random) {
            throw new ProtocolError('Invalid server echo');
        }

        log('INFO', 'Initializing Sign-In with Google');

        google.accounts.id.initialize({
            client_id: '450779629644-4ijk6scsa1b903nk66ne03tc2mk7ev2o.apps.googleusercontent.com',
            callback: async (response: { credential: string }) => {
                log('INFO', 'Validating Sign-In with Google');

                connection.send(packets.SB_REQ_AUTHENTICATE, loginScreen.username, response.credential);
                const [playerID] = await connection.awaitPacket(packets.CB_RES_AUTHENTICATED);

                loginScreen.setState('done');

                log('INFO', 'Sign-In with Google successful');

                resolve(playerID);
            }
        });

        google.accounts.id.renderButton(loginScreen.buttonElement, {
            theme: 'filled_blue',
            text: 'continue_with',
            shape: 'pill',
            click_listener: () => {
                if (loginScreen.state !== 'ready') {
                    throw new Error('Invalid login state');
                }

                loginScreen.setState('validating');
            }
        });

        loginScreen.setState('waiting');
    });
}

window.addEventListener('error', (event) => {
    popup('An unexpected error occurred, please try reloading the page.');
});

window.addEventListener('unhandledrejection', (event) => {
    popup('An unexpected error occurred, please try reloading the page.');
});
