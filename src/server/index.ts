import log from '@shared/log';
import Server from '@server/server';
import * as packets from '@shared/packets';
import Connection from '@shared/connection';
import { USERNAME_REGEX, ChatColor } from '@shared/constants';
import { DeserializeError } from '@shared/errors';
import { OAuth2Client } from 'google-auth-library';

enum ConnectionState {
    CONNECTED,
    AUTHENTICATED
}

type Player = {
    readonly connection: Connection;
    readonly playerID: number;
    readonly username: string;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number };
};

async function main() {
    log('INFO', 'Starting server...');

    const oauthClient = new OAuth2Client();

    let playerID: number | null = null;
    let players: Player[] = [];

    new Server((connection) => {
        log('INFO', `<${connection.ip}> Connected`);

        let state: ConnectionState = ConnectionState.CONNECTED;

        try {
            connection.onPacket(packets.SB_REQ_PING, (random) => {
                connection.send(packets.CB_RES_PONG, random);
            });

            connection.onPacket(packets.SB_REQ_AUTHENTICATE, async (username, token) => {
                if (state !== ConnectionState.CONNECTED) {
                    connection.send(packets.CB_ERROR_INVALID_STATE);
                    return;
                }

                if (!USERNAME_REGEX.test(username)) {
                    connection.send(packets.CB_ERROR_AUTHENTICATION_FAILED);
                    return;
                }

                const payload = (await oauthClient.verifyIdToken({
                    idToken: token,
                    audience: process.env.GOOGLE_CLIENT_ID
                })).getPayload();

                if (payload === undefined) {
                    connection.send(packets.CB_ERROR_AUTHENTICATION_FAILED);
                    return;
                }

                // TODO: If payload.sub is on banlist, send CB_ERROR_BANNED

                log('INFO', `<${connection.ip}> Authenticated as "${username}" (${payload.sub} - ${payload.email})`);

                for (let i = 0; i < 100; i++) {
                    playerID = Math.floor(Math.random() * 0xff);
                    if (!players.some((p) => p.playerID === playerID)) {
                        break;
                    }
                }

                if (playerID === null || players.some((p) => p.playerID === playerID)) {
                    throw new Error('Failed to assign player ID');
                }

                state = ConnectionState.AUTHENTICATED;
                connection.send(packets.CB_RES_AUTHENTICATED, playerID, players);

                log('INFO', `<${connection.ip}> Assigned player ID ${playerID}`);

                players.forEach((p) => {
                    p.connection.send(packets.CB_EVT_ADD_PLAYER, playerID, username);
                    p.connection.send(packets.CB_EVT_CHAT_MESSAGE, [
                        { color: ChatColor.BLUE, bold: true, text: username },
                        { color: ChatColor.CYAN, bold: false, text: ' has joined the game' }
                    ]);
                });

                players.push({
                    connection,
                    playerID,
                    username,
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0 }
                });
            });

            connection.onPacket(packets.SB_EVT_PLAYER_MOVE, (positionX, positionY, positionZ, rotationX, rotationY) => {
                if (state !== ConnectionState.AUTHENTICATED) {
                    connection.send(packets.CB_ERROR_INVALID_STATE);
                    return;
                }

                const player = players.find((player) => player.playerID === playerID)!;

                player.position = { x: positionX, y: positionY, z: positionZ };
                player.rotation = { x: rotationX, y: rotationY };

                players.forEach((p) => {
                    if (p.playerID === playerID) {
                        return;
                    }
                    p.connection.send(packets.CB_EVT_PLAYER_MOVE, player.playerID, positionX, positionY, positionZ, rotationX, rotationY);
                });
            });

            connection.onPacket(packets.SB_EVT_PLAYER_SHOOT, () => {
                if (state !== ConnectionState.AUTHENTICATED) {
                    connection.send(packets.CB_ERROR_INVALID_STATE);
                    return;
                }

                const player = players.find((p) => p.playerID === playerID)!;

                players.forEach((p) => {
                    if (p.playerID === playerID) {
                        return;
                    }
                    p.connection.send(packets.CB_EVT_PLAYER_SHOOT, player.playerID);
                });
            });

            connection.onPacket(packets.SB_REQ_CHAT_MESSAGE, (message) => {
                if (state !== ConnectionState.AUTHENTICATED) {
                    connection.send(packets.CB_ERROR_INVALID_STATE);
                    return;
                }

                const player = players.find((p) => p.playerID === playerID)!;

                players.forEach((p) => {
                    p.connection.send(packets.CB_EVT_CHAT_MESSAGE, [
                        { color: ChatColor.GRAY, bold: true, text: player.username },
                        { color: ChatColor.WHITE, bold: false, text: ': ' },
                        { color: ChatColor.WHITE, bold: false, text: message }
                    ]);
                });
            });

            connection.websocket.addEventListener('close', () => {
                log('INFO', `<${connection.ip}> Disconnected`);

                if (state === ConnectionState.AUTHENTICATED) {
                    const player = players.find((p) => p.playerID === playerID)!;

                    players = players.filter((p) => p.playerID !== playerID);

                    players.forEach((p) => {
                        p.connection.send(packets.CB_EVT_REMOVE_PLAYER, player.playerID);
                    });
                }
            });
        } catch (e: any) {
            if (e instanceof DeserializeError) {
                log('WARN', `<${connection.ip}> Invalid packet: ${e.message}`);
                connection.send(packets.CB_ERROR_INVALID_PACKET);
            } else {
                log('ERROR', `<${connection.ip}> Unexpected error: ${e.stack ?? e.message}`);
                connection.send(packets.CB_ERROR_UNEXPECTED);
            }
        }
    });
}

main();
