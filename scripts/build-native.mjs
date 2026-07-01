#!/usr/bin/env node
import { rebuild } from '@electron/rebuild'
import * as path from 'path'
import * as vars from './vars.mjs'

import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))


if (process.platform === 'win32' || process.platform === 'linux') {
    process.env.ARCH = ((process.env.ARCH || process.arch) === 'arm') ? 'armv7l' : process.env.ARCH || process.arch
} else {
    process.env.ARCH ??= process.arch
}

const overallStart = Date.now()

function ms(n) {
    return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(1)}s`
}

for (let dir of ['app', 'tabby-core', 'tabby-local', 'tabby-ssh', 'tabby-terminal']) {
    const dirStart = Date.now()
    const build = rebuild({
        buildPath: path.resolve(__dirname, '../' + dir),
        electronVersion: vars.electronVersion,
        arch: process.env.ARCH,
        force: true,
    })
    build.catch(e => {
        console.error(e)
        process.exit(1)
    })

    build.lifecycle.on('module-found', name => {
        const mStart = Date.now()
        const lc = build.lifecycle
        const captureName = name
        lc.on('module-done', () => {
            console.info(`  ${captureName} ${ms(Date.now() - mStart)}`)
        })
        lc.on('module-skip', () => {
            console.info(`  ${captureName} skipped`)
        })
        process.stdout.write(`[${dir}] ${name}... `)
    })

    await build
    console.info(`[${dir}] done ${ms(Date.now() - dirStart)}`)
}

console.info(`\nTotal: ${ms(Date.now() - overallStart)}`)
