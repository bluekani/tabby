import * as fs from 'fs'
import * as path from 'path'
import rspack from '@rspack/core'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

const bundleAnalyzer = new BundleAnalyzerPlugin({
    analyzerPort: 0,
})

export default options => {
    const sourceMapOptions = {
        exclude: [/node_modules/, /vendor/],
        filename: '[file].map',
    }

    const isDev = !!process.env.TABBY_DEV
    const config = {
        target: 'node',
        entry: 'src/index.ts',
        context: options.dirname,
        devtool: false,
        output: {
            path: path.resolve(options.dirname, 'dist'),
            filename: 'index.js',
            pathinfo: true,
            library: {
                type: 'umd',
            },
            publicPath: 'auto',
        },
        mode: isDev ? 'development' : 'production',
        optimization:{
            minimize: false,
        },
        cache: !isDev ? false : {
            type: 'filesystem',
            cacheDirectory: path.resolve(options.dirname, 'node_modules', '.rspack-cache'),
        },
        resolve: {
            alias: options.alias ?? {},
            modules: ['.', 'src', 'node_modules', '../app/node_modules', '../node_modules'].map(x => path.join(options.dirname, x)),
            extensions: ['.ts', '.js'],
            mainFields: ['esm2015', 'browser', 'module', 'main'],
        },
        ignoreMessages: [/Failed to parse source map/],
        module: {
            rules: [
                ...options.rules ?? [],
                {
                    test: /\.js$/,
                    enforce: 'pre',
                    use: {
                        loader: 'source-map-loader',
                    },
                },
                {
                    test: /\.(m?)js$/,
                    loader: 'builtin:swc-loader',
                    options: {
                        jsc: {
                            parser: {
                                syntax: 'typescript',
                                tsx: true,
                            },
                        },
                    },
                    resolve: {
                        fullySpecified: false,
                    },
                },
                {
                    test: /\.ts$/,
                    use: [
                        {
                            loader: 'builtin:swc-loader',
                            options: {
                                jsc: {
                                    parser: {
                                        syntax: 'typescript',
                                        tsx: true,
                                        decorators: true,
                                    },
                                    transform: {
                                        decoratorMetadata: true,
                                        legacyDecorator: true,
                                    },
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.pug$/,
                    use: [
                        'apply-loader',
                        {
                            loader: 'pug-loader',
                            options: {
                                pretty: true,
                            },
                        },
                    ],
                },
                { test: /\.scss$/, use: ['@tabby-gang/to-string-loader', 'css-loader', 'sass-loader'], include: /(theme.*|component)\.scss/ },
                { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'], exclude: /(theme.*|component)\.scss/ },
                { test: /\.css$/, use: ['@tabby-gang/to-string-loader', 'css-loader'], include: /component\.css/ },
                { test: /\.css$/, use: ['style-loader', 'css-loader'], exclude: /component\.css/ },
                { test: /\.yaml$/, use: ['yaml-loader'] },
                { test: /\.svg/, use: ['svg-inline-loader'] },
                {
                    test: /\.(eot|otf|woff|woff2|ogg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    type: 'asset/resource',
                },
                {
                    test: /\.ttf$/,
                    type: 'asset/inline',
                },
                {
                    test: /\.po$/,
                    use: [
                        { loader: 'json-loader' },
                        { loader: 'po-gettext-loader' },
                    ],
                },
            ],
        },
        externals: [
            '@electron/remote',
            '@serialport/bindings',
            '@serialport/bindings-cpp',
            'any-promise',
            'child_process',
            'electron-promise-ipc',
            'electron-updater',
            'electron',
            'fontmanager-redux',
            'fs',
            'keytar',
            'macos-native-processlist',
            'native-process-working-directory',
            'net',
            'ngx-toastr',
            'os',
            'path',
            'readline',
            'russh',
            '@luminati-io/socksv5',
            'stream',
            'windows-native-registry',
            '@tabby-gang/windows-process-tree',
            '@tabby-gang/windows-process-tree/build/Release/windows_process_tree.node',
            /^@angular(?!\/common\/locales)/,
            /^@ng-bootstrap/,
            /^rxjs/,
            /^tabby-/,
            ...options.externals || [],
        ],
        plugins: [
            new rspack.SourceMapDevToolPlugin(sourceMapOptions),
        ],
    }
    if (process.env.PLUGIN_BUNDLE_ANALYZER === options.name) {
        config.plugins.push(bundleAnalyzer)
        config.cache = false
    }
    return config
}
