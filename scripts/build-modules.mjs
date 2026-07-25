#!/usr/bin/env node
import * as vars from './vars.mjs'
import log from 'npmlog'
import rspack from '@rspack/core'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function pickConfig (configPath, baseName = 'config') {
    return join(configPath, `rspack.${baseName}.mjs`)
}

const configs = [
    pickConfig(join(__dirname, '..', 'app'), 'config.main'),
    pickConfig(join(__dirname, '..', 'app'), 'config'),
    ...vars.allPackages.map(x => pickConfig(join(__dirname, '..', x))),
]

const runner = promisify(rspack)

;(async () => {
    try {
        for (const config of configs) {
            log.info('build', `[rspack] ${config}`)
            const configUrl = pathToFileURL(config).href
            const stats = await runner((await import(configUrl)).default())
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
