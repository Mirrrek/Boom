import { USERNAME_REGEX } from '@shared/constants';

export default class LoginScreen {
    private loginScreenElement: HTMLDivElement;
    private usernameElement: HTMLInputElement;
    private googleSignInButtonElement: HTMLDivElement;
    private currentState: 'initializing' | 'waiting' | 'ready' | 'validating' | 'done';

    public constructor() {
        this.loginScreenElement = document.getElementById('login-screen') as HTMLDivElement;
        this.usernameElement = document.getElementById('login-username') as HTMLInputElement;
        this.googleSignInButtonElement = document.getElementById('login-google-sign-in-button') as HTMLDivElement;
        this.currentState = 'initializing';

        this.usernameElement.addEventListener('input', () => {
            if (this.currentState === 'done') {
                throw new Error('LoginScreen already done');
            }

            if (USERNAME_REGEX.test(this.usernameElement.value)) {
                this.usernameElement.classList.remove('invalid');
                if (this.currentState === 'waiting') {
                    this.setState('ready');
                }
            } else {
                this.usernameElement.classList.add('invalid');
                if (this.currentState === 'ready') {
                    this.setState('waiting');
                }
            }
        });

        this.usernameElement.addEventListener('keydown', (event) => {
            if (this.currentState === 'done') {
                throw new Error('LoginScreen already done');
            }

            if (event.key === 'Enter' && this.currentState === 'ready') {
                this.googleSignInButtonElement.focus();
            }
        });
    }

    public setState(state: 'initializing' | 'waiting' | 'ready' | 'validating' | 'done') {
        if (this.currentState === 'done') {
            throw new Error('LoginScreen already done');
        }

        this.currentState = state;
        switch (this.currentState) {
            case 'initializing':
                this.usernameElement.style.opacity = '0';
                this.usernameElement.style.pointerEvents = 'none';
                this.googleSignInButtonElement.style.opacity = '0';
                this.googleSignInButtonElement.style.pointerEvents = 'none';
                break;
            case 'waiting':
                this.usernameElement.style.opacity = '1';
                this.usernameElement.style.pointerEvents = 'auto';
                this.googleSignInButtonElement.style.opacity = '0';
                this.googleSignInButtonElement.style.pointerEvents = 'none';
                break;
            case 'ready':
                this.usernameElement.style.opacity = '1';
                this.usernameElement.style.pointerEvents = 'auto';
                this.googleSignInButtonElement.style.opacity = '1';
                this.googleSignInButtonElement.style.pointerEvents = 'auto';
                break;
            case 'validating':
                this.usernameElement.style.opacity = '0.75';
                this.usernameElement.style.pointerEvents = 'none';
                this.googleSignInButtonElement.style.opacity = '0.75';
                this.googleSignInButtonElement.style.pointerEvents = 'none';
                break;
            case 'done':
                this.loginScreenElement.style.opacity = '0';
                this.loginScreenElement.style.pointerEvents = 'none';
                setTimeout(() => {
                    this.loginScreenElement.remove();
                }, 1000);
                break;
        }
    }

    public get username(): string | null {
        return this.usernameElement.value;
    }

    public get state(): 'initializing' | 'waiting' | 'ready' | 'validating' | 'done' {
        return this.currentState;
    }

    public get buttonElement(): HTMLDivElement {
        return this.googleSignInButtonElement;
    }
}
