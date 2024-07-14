import joinSound from '@assets/sounds/join.mp3';
import shotSound from '@assets/sounds/shot.mp3';

export enum Sound {
    JOIN,
    SHOT
}

const soundMap: { [key: string]: string } = {
    [Sound.JOIN]: joinSound,
    [Sound.SHOT]: shotSound
}

let configuration: {
    context: AudioContext;
    panner: PannerNode;
    audioBuffers: { [key: string]: AudioBuffer }
} | null = null;

function setupAudio(): Promise<{ context: AudioContext, panner: PannerNode, audioBuffers: { [key: string]: AudioBuffer } }> {
    return new Promise(async (resolve) => {
        const context = new AudioContext();

        const panner = context.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;

        let audioBuffers: { [key: string]: AudioBuffer } = {};

        await Promise.all(Object.keys(soundMap).map(async (sound) => {
            const response = await fetch(soundMap[sound]);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await context.decodeAudioData(arrayBuffer);

            audioBuffers[sound] = buffer;
        }));

        resolve({ context, panner, audioBuffers });
    });
}

export async function playSound(sound: Sound, position?: { x: number, y: number, z: number }): Promise<void> {
    if (configuration === null) {
        configuration = await setupAudio();
    }

    // TODO: Set panner position and orientation

    const source = configuration.context.createBufferSource();
    source.buffer = configuration.audioBuffers[sound];
    source.connect(configuration.context.destination);
    source.start();
}
