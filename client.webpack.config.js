const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
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
        })
    ]
};
