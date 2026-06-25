#!/usr/bin/env node
import * as vars from './vars.mjs'
import log from 'npmlog'
import rspack from '@rspack/core'
import webpack from 'webpack'
import { promisify } from 'node:util'

// Packages that require Webpack (Angular and app/)
const webpackOnly = [
    'app',
    'tabby-core',
    'tabby-settings',
    'tabby-terminal',
    'tabby-web',
    'tabby-ssh',
    'tabby-serial',
    'tabby-local',
]

const configs = [
    '../app/webpack.config.main.mjs',
    '../app/webpack.config.mjs',
    ...vars.builtinPlugins.map(x => `../${x}/webpack.config.mjs`),
]

const isWebpack = c => webpackOnly.some(p => c.includes(`/${p}`))

;(async () => {
    try {
        for (const c of configs) {
            const useWebpack = isWebpack(c)
            console.log(`Building: ${c} -> ${useWebpack ? 'webpack' : 'rspack'}`)
            const builder = useWebpack ? webpack : rspack
            const config = (await import(c)).default()
            const stats = await promisify(builder)(config)
            console.log(stats.toString({ colors: true }))
            if (stats.hasErrors()) {
                process.exit(1)
            }
        }
    } catch (error) {
        log.error('build', String(error))
        process.exit(1)
    }
})()
