#!/usr/bin/env node
import * as vars from './vars.mjs'
import log from 'npmlog'
import webpack from 'webpack'
import { promisify } from 'node:util'
import pLimit from 'p-limit'

const configs = [
    '../app/webpack.config.main.mjs',
    '../app/webpack.config.mjs',
    ...vars.allPackages.map(x => `../${x}/webpack.config.mjs`),
];

(async () => {
    const limit = pLimit(4)
    try {
        await Promise.all(configs.map(c => limit(async () => {
            log.info('build', c)
            const stats = await promisify(webpack)((await import(c)).default())
            console.log(stats.toString({ colors: true }))
            if (stats.hasErrors()) {
                throw new Error(`Build failed: ${c}`)
            }
        })))
    } catch (error) {
        log.error('build', String(error))
        process.exit(1)
    }
})()
