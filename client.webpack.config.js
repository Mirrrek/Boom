const path = require('path');
const { spawn, execSync } = require('child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
    const isDevelopment = argv.mode === 'development';
    return {
        entry: './src/client/index.ts',
        devtool: 'inline-source-map',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader'
                },
                {
                    include: path.resolve(__dirname, 'src/assets'),
                    type: 'asset/resource'
                }
            ]
        },
        resolve: {
            extensions: ['.ts', '.js'],
            alias: {
                '@shared': path.resolve(__dirname, 'src/shared'),
                '@assets': path.resolve(__dirname, 'src/assets'),
                '@client': path.resolve(__dirname, 'src/client')
            }
        },
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, 'dist', 'client'),
            publicPath: '/',
            clean: true
        },
        plugins: [
            new HtmlWebpackPlugin({
                filename: 'index.html',
                template: './src/client/index.html',
                hash: true
            }),
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
                        child = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'start:client'], { stdio: 'inherit' });
                    });
                }
            }
        ],
        watch: isDevelopment
    }
};
