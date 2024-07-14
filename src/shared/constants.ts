export const SERVER_URL = 'ws://localhost:443';
export const USERNAME_REGEX = /^[\P{Cc}\P{Cn}\P{Cs}]{4,32}$/u;

export enum ChatColor {
    BLACK = 0x202020,
    WHITE = 0xf0f0f0,
    RED = 0xff6060,
    GREEN = 0x60ff60,
    BLUE = 0x6060ff,
    YELLOW = 0xffff60,
    ORANGE = 0xffb060,
    PURPLE = 0xff60ff,
    PINK = 0xffc0ff,
    CYAN = 0x60ffff,
    GRAY = 0x909090
}
