// Shared Rspack config for built-in Tabby plugins (tabby-ssh, tabby-linkifier, ...).
//
// Mirrors the API of webpack.plugin.config.mjs so that a plugin's
// rspack.config.mjs is a near-clone of its webpack.config.mjs:
//
//   export default () => config({ name: 'ssh', dirname: __dirname })
//
// Notable differences from the webpack equivalent:
//   - Uses @rspack/core (webpack-5-compatible) instead of webpack.
//   - @ngtools/webpack is reused as a loader+plugin in jitMode: the loader
//     does TypeScript → JS (with Angular AOT transforms) and rewrites
//     `templateUrl: './x.pug'` to `template: require('./x.pug')`. This is the
//     same trick that the legacy webpack build used.
//   - ESM linking is relaxed so type-only re-exports in Angular decorator
//     metadata don't fail the build.

import * as fs from 'fs'
import * as path from 'path'
import rspack from '@rspack/core'
import { AngularWebpackPlugin } from '@ngtools/webpack'

export default options => {
    const isDev = !!process.env.TABBY_DEV

    const sourceMapOptions = {
        exclude: [/node_modules/, /vendor/],
        filename: '[file].map',
        moduleFilenameTemplate: `webpack-tabby-${options.name}:///[resource-path]`,
    }
    if (process.env.CI) {
        sourceMapOptions.append = '\n//# sourceMappingURL=../../../app.asar.unpacked/assets/webpack/[url]'
    }
    const DevtoolPlugin = (process.platform === 'win32' || process.platform === 'linux') && isDev
        ? rspack.EvalSourceMapDevToolPlugin
        : rspack.SourceMapDevToolPlugin

    const config = {
        target: 'node',
        entry: 'src/index.ts',
        context: options.dirname,
        devtool: false,
        output: {
            path: path.resolve(options.dirname, 'dist'),
            filename: 'index.js',
            pathinfo: true,
            library: { type: 'umd' },
            publicPath: 'auto',
        },
        mode: isDev ? 'development' : 'production',
        optimization: {
            minimize: false,
            // Angular JIT uses classes/interfaces that are only referenced in
            // decorator metadata. Rspack's ESM linker is stricter than
            // webpack's; disable aggressive tree-shaking so it doesn't drop
            // re-exports of those identifiers.
            usedExports: false,
            sideEffects: false,
            providedExports: true,
        },
        cache: !isDev ? false : {
            type: 'filesystem',
            cacheDirectory: path.resolve(options.dirname, 'node_modules', '.rspack-cache'),
        },
        resolve: {
            alias: {
                webpack: '@rspack/core',
                ...(options.alias ?? {}),
            },
            modules: ['.', 'src', 'node_modules', '../app/node_modules', '../node_modules'].map(x => path.join(options.dirname, x)),
            extensions: ['.ts', '.js'],
            mainFields: ['esm2015', 'browser', 'module', 'main'],
        },
        ignoreWarnings: [/Failed to parse source map/],
        module: {
            parser: {
                javascript: {
                    // Allow type-only re-exports (interfaces) referenced from
                    // Angular's `__metadata("design:type", X)` calls.
                    exportsPresence: 'ignore',
                    reexportExportsPresence: 'ignore',
                },
            },
            rules: [
                ...options.rules ?? [],
                {
                    test: /\.js$/,
                    enforce: 'pre',
                    use: {
                        loader: 'source-map-loader',
                        options: {
                            filterSourceMappingUrl: (url, resourcePath) => {
                                if (/node_modules/.test(resourcePath) && !resourcePath.includes('xterm')) {
                                    return false
                                }
                                return true
                            },
                        },
                    },
                },
                {
                    test: /\.(m?)js$/,
                    exclude: /node_modules/,
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                    },
                    resolve: { fullySpecified: false },
                },
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: '@ngtools/webpack',
                        },
                    ],
                },
                { test: /\.pug$/, use: ['apply-loader', { loader: 'pug-loader', options: { pretty: true } }] },
                { test: /\.scss$/, use: ['@tabby-gang/to-string-loader', 'css-loader', 'sass-loader'], include: /(theme.*|component)\.scss/ },
                { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'], exclude: /(theme.*|component)\.scss/ },
                { test: /\.css$/, use: ['@tabby-gang/to-string-loader', 'css-loader'], include: /component\.css/ },
                { test: /\.css$/, use: ['style-loader', 'css-loader'], exclude: /component\.css/ },
                { test: /\.yaml$/, use: ['yaml-loader'] },
                { test: /\.svg/, use: ['svg-inline-loader'] },
                { test: /\.(eot|otf|woff|woff2|ogg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, type: 'asset' },
                { test: /\.ttf$/, type: 'asset/inline' },
                { test: /\.po$/, use: [{ loader: 'json-loader' }, { loader: 'po-gettext-loader' }] },
            ],
        },
        externals: [
            '@electron/remote', '@serialport/bindings', '@serialport/bindings-cpp', 'any-promise',
            'child_process', 'electron-promise-ipc', 'electron-updater', 'electron',
            'fontmanager-redux', 'fs', 'keytar', 'macos-native-processlist',
            'native-process-working-directory', 'net', 'ngx-toastr', 'os', 'path',
            'readline', 'russh', '@luminati-io/socksv5', 'stream',
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
            new DevtoolPlugin(sourceMapOptions),
            new AngularWebpackPlugin({
                tsconfig: path.resolve(options.dirname, 'tsconfig.json'),
                directTemplateLoading: false,
                jitMode: true,
            }),
        ],
    }
    return config
}
