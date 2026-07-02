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

for (let dir of ['app', 'tabby-core', 'tabby-local', 'tabby-ssh', 'tabby-terminal']) {
    const build = rebuild({
        buildPath: path.resolve(__dirname, '../' + dir),
        electronVersion: vars.electronVersion,
        arch: process.env.ARCH,
    })
    build.catch(e => {
        console.error(e)
        process.exit(1)
    })

    build.lifecycle.on('module-found', name => {
        process.stdout.write(`[${dir}] ${name}... `)
    })

    build.lifecycle.on('module-done', name => {
        console.info('done')
    })

    build.lifecycle.on('module-skip', name => {
        console.info('skipped')
    })

    await build
}
