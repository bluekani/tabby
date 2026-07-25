#!/usr/bin/env node
import * as vars from './vars.mjs'
import log from 'npmlog'
import webpack from 'webpack'
import rspack from '@rspack/core'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Per-package: use rspack.config.mjs when present, else webpack.config.mjs.
// This lets a plugin opt in to Rspack without touching build-modules.mjs.
const configs = [
    { config: '../app/webpack.config.main.mjs', bundler: 'webpack' },
    { config: '../app/webpack.config.mjs', bundler: 'webpack' },
    ...vars.allPackages.map(x => {
        const rspackConfig = join(__dirname, '..', x, 'rspack.config.mjs')
        const webpackConfig = join(__dirname, '..', x, 'webpack.config.mjs')
        if (existsSync(rspackConfig)) {
            return { config: `../${x}/rspack.config.mjs`, bundler: 'rspack' }
        }
        if (existsSync(webpackConfig)) {
            return { config: `../${x}/webpack.config.mjs`, bundler: 'webpack' }
        }
        return null
    }).filter(Boolean),
]

const bundlers = { webpack, rspack }

;(async () => {
    try {
        for (const { config, bundler } of configs) {
            log.info('build', `[${bundler}] ${config}`)
            const runner = promisify(bundlers[bundler])
            const stats = await runner((await import(config)).default())
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
