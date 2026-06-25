#!/usr/bin/env node
import * as vars from './vars.mjs'
import log from 'npmlog'
import rspack from '@rspack/core'
import webpack from 'webpack'
import { promisify } from 'node:util'

const configs = [
    '../app/webpack.config.main.mjs',
    '../app/webpack.config.mjs',
    ...vars.builtinPlugins.map(x => `../${x}/webpack.config.mjs`),
]

const isWebpack = c => webpackOnly.some(p => c.includes(p))

(async () => {
    try {
        for (const c of configs) {
            log.info('build', c)
            const builder = isWebpack(c) ? webpack : rspack
            const stats = await promisify(builder)((await import(c)).default())
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
