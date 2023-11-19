import log from '@shared/log';
import Server from '@server/server';
import * as packets from '@shared/packets';
import { USERNAME_REGEX } from '@shared/constants';
import { DeserializeError } from '@shared/errors';
import { OAuth2Client } from 'google-auth-library';

enum ConnectionState {
    CONNECTED,
    AUTHENTICATED
}

async function main() {
    log('INFO', 'Starting server...');

    const oauthClient = new OAuth2Client();

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
                state = ConnectionState.AUTHENTICATED;

                const playerID = Math.floor(Math.random() * 0xff);
                connection.send(packets.CB_RES_AUTHENTICATED, playerID);

                log('INFO', `<${connection.ip}> Assigned player ID ${playerID}`);

                // TODO: Start game
            });

            connection.websocket.addEventListener('close', () => {
                log('INFO', `<${connection.ip}> Disconnected`);
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
