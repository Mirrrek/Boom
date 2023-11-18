const path = require('path');
const { spawn, execSync } = require('child_process');

module.exports = (env, argv) => {
    const isDevelopment = argv.mode === 'development';
    return {
        entry: './src/server/index.ts',
        devtool: 'inline-source-map',
        target: 'node',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader'
                }
            ]
        },
        resolve: {
            extensions: ['.ts', '.js'],
            alias: {
                '@shared': path.resolve(__dirname, 'src/shared'),
                '@server': path.resolve(__dirname, 'src/server')
            }
        },
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, 'dist/server'),
            clean: true
        },
        plugins: [
            {
                apply: (compiler) => {
                    if (!isDevelopment) return;
                    let child = null;
                    compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
                        if (child !== null) {
                            if (/^win/.test(process.platform)) {
                                try {
                                    execSync(`taskkill /pid ${child.pid} /T /F`);
                                } catch (e) { }
                            } else {
                                child.kill();
                            }
                        }
                        child = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'start:server'], { stdio: 'inherit' });
                    });
                }
            }
        ],
        watch: isDevelopment
    }
};
