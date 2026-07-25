#!/usr/bin/env node
import * as vars from './vars.mjs'
import log from 'npmlog'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Per-package: locate rspack.${baseName}.mjs. app has two configs (renderer +
// electron main), so we look them up by name.
function pickConfig (configPath, baseName = 'config') {
    return join(configPath, `rspack.${baseName}.mjs`)
}

const configs = [
    pickConfig(join(__dirname, '..', 'app'), 'config.main'),
    pickConfig(join(__dirname, '..', 'app'), 'config'),
    ...vars.allPackages.map(x => pickConfig(join(__dirname, '..', x))),
]

const root = join(__dirname, '..')
const rspackBin = join(root, 'node_modules', '@rspack', 'cli', 'bin', 'rspack.js')
const children = []

function start (config) {
    const cwd = dirname(config)
    log.info('watch', `[rspack] ${relative(root, config)}`)
    const child = spawn(process.execPath, [rspackBin, 'watch', '--config', config], {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, TABBY_DEV: '1' },
    })
    children.push(child)
}

function shutdown (code = 0) {
    for (const child of children) {
        if (!child.killed) child.kill('SIGTERM')
    }
    process.exit(code)
}

process.on('SIGINT', () => shutdown(130))
process.on('SIGTERM', () => shutdown(143))

for (const { config, legacy } of configs) {
    start(config, legacy)
}
