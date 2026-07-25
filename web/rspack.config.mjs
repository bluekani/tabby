import * as path from 'path'
import * as url from 'url'
import { rspack } from '@rspack/core'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const externals = {}
for (const key of [
    'child_process',
    'crypto',
    'dns',
    'fs',
    'http',
    'https',
    'net',
    'path',
    'querystring',
    'tls',
    'tty',
    'zlib',
    '../build/Release/cpufeatures.node',
    './crypto/build/Release/sshcrypto.node',
]) {
    externals[key] = `commonjs ${key}`
}

const config = {
    name: 'tabby-web-entry',
    target: 'web',
    entry: {
        preload: path.resolve(__dirname, 'entry.preload.ts'),
        bundle: path.resolve(__dirname, 'entry.ts'),
    },
    mode: process.env.TABBY_DEV ? 'development' : 'production',
    optimization: {
        minimize: false,
        concatenateModules: true,
    },
    context: __dirname,
    devtool: 'source-map',
    output: {
        path: path.join(__dirname, 'dist'),
        pathinfo: true,
        filename: '[name].js',
        publicPath: 'auto',
    },
    resolve: {
        modules: ['../app/node_modules', 'node_modules', '../node_modules', '../app/assets/'].map(x => path.join(__dirname, x)),
        extensions: ['.ts', '.js'],
        fallback: {
            stream: path.join(__dirname, 'node_modules/stream-browserify/index.js'),
            assert: path.join(__dirname, 'node_modules/assert/assert.js'),
            constants: path.join(__dirname, 'node_modules/constants-browserify/constants.json'),
            util: path.join(__dirname, 'node_modules/util/util.js'),
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'builtin:swc-loader',
                options: {
                    jsc: {
                        parser: { syntax: 'typescript', decorators: true },
                        target: 'es2015',
                    },
                },
                type: 'javascript/auto',
            },
            { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
            { test: /\.css$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
            {
                test: /\.(png|svg|ttf|eot|otf|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                type: 'asset',
            },
        ],
    },
    externals,
    experiments: {
        css: false,
    },
    plugins: [
        new rspack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.TABBY_DEV ? 'development' : 'production'),
        }),
    ],
}

export default () => config
