
import { ProtocolError } from '@shared/errors';
import LoginScreen from '@client/loginScreen';
import Connection from '@shared/connection';
import * as packets from '@shared/packets';
import { playSound, Sound } from '@client/audio';
import log from '@shared/log';

declare const google: any;

export function login(connection: Connection): Promise<{ playerID: number, players: { playerID: number, username: string }[] }> {
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
                const [playerID, players] = await connection.awaitPacket(packets.CB_RES_AUTHENTICATED);

                loginScreen.setState('done');

                log('INFO', 'Sign-In with Google successful');

                resolve({ playerID, players });
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

type Player = {
    readonly playerID: number;
    readonly username: string;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number };
}

type GameState = {
    readonly playerID: number;
    readonly players: Player[];
}

export function play(connection: Connection, state: GameState): Promise<void> {
    return new Promise(async (resolve) => {
        log('INFO', `Joined game of ${state.players.length} players (${state.players.slice(0, 5).map(p => p.username).join(', ') + (state.players.length > 5 ? '...' : '')})`);
        playSound(Sound.JOIN);

        connection.onPacket(packets.CB_EVT_ADD_PLAYER, (playerID: number, username: string) => {
            log('INFO', `Player "${username}" joined the game (ID ${playerID})`);

            state.players.push({ playerID, username, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0 } });
        });

        connection.onPacket(packets.CB_EVT_REMOVE_PLAYER, (playerID: number) => {
            if (playerID == state.playerID) {
                log('INFO', 'You have been kicked from the game');

                return resolve();
            }

            log('INFO', `Player "${state.players.find((player) => player.playerID === playerID)!.username}" left the game (ID ${playerID})`);

            state.players.splice(state.players.findIndex((player) => player.playerID === playerID), 1);
        });

        connection.onPacket(packets.CB_EVT_PLAYER_MOVE, (playerID: number, positionX: number, positionY: number, positionZ: number, rotationX: number, rotationY: number) => {
            const player = state.players.find((player) => player.playerID === playerID)!;

            player.position = { x: positionX, y: positionY, z: positionZ };
            player.rotation = { x: rotationX, y: rotationY };
        });

        connection.onPacket(packets.CB_EVT_PLAYER_SHOOT, (playerID: number) => {
            const player = state.players.find((player) => player.playerID === playerID)!;

            playSound(Sound.SHOT, player.position);
        });

        connection.onPacket(packets.CB_EVT_CHAT_MESSAGE, (chunks: { color: number, bold: boolean, text: string }[]) => {
            log('INFO', `Chat message: "${chunks.map((chunk) => chunk.text).join('')}"`);
        });
    });
}
