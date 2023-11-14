const path = require('path');

module.exports = {
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
    }
};
