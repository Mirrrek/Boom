import { isServer } from '@shared/environment';

export default function log(type: 'INFO' | 'WARN' | 'ERROR', message: string): void {
    if (isServer) {
        process.stdout.write(`${{'INFO': '\x1b[36m', 'WARN': '\x1b[33m', 'ERROR': '\x1b[31m'}[type]}\x1b[1m[${new Date().toISOString()}] [${type}]\x1b[2m ${message.replace(/\n/g, '\n> ')}\x1b[0m\n`);
    } else {
        console.log(`%c[${new Date().toISOString()}] [${type}]%c ${message}`, `color: ${{'INFO': 'cyan', 'WARN': 'yellow', 'ERROR': 'red'}[type]}; font-weight: bold`, `color: ${{'INFO': 'cyan', 'WARN': 'yellow', 'ERROR': 'red'}[type]}; font-weight: normal`);
    }
}
