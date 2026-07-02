#!/usr/bin/env node
import sh from 'shelljs'
import * as vars from './vars.mjs'
import log from 'npmlog'

function ms(n) {
    return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(1)}s`
}

const overallStart = Date.now()

log.info('patch')
const patchStart = Date.now()
sh.exec(`yarn patch-package`, { fatal: true })
console.info(`patch-package ${ms(Date.now() - patchStart)}`)

log.info('deps', 'app')
const appStart = Date.now()
sh.cd('app')
sh.exec(`yarn install --force --network-timeout 1000000`, { fatal: true })
// Some native packages might fail to build before patch-package gets a chance to run via postinstall
sh.exec(`yarn postinstall`, { fatal: false })
sh.cd('..')
console.info(`[app] ${ms(Date.now() - appStart)}`)

log.info('deps', 'web')
const webStart = Date.now()
sh.cd('web')
sh.exec(`yarn install --force --network-timeout 1000000`, { fatal: true })
sh.exec(`yarn patch-package`, { fatal: true })
sh.cd('..')
console.info(`[web] ${ms(Date.now() - webStart)}`)

vars.allPackages.forEach(plugin => {
    log.info('deps', plugin)
    const pluginStart = Date.now()
    sh.cd(plugin)
    sh.exec(`yarn install --force --network-timeout 1000000`, { fatal: true })
    sh.cd('..')
    console.info(`[${plugin}] ${ms(Date.now() - pluginStart)}`)
})

if (['darwin', 'linux'].includes(process.platform)) {
    sh.cd('node_modules')
    for (let x of vars.builtinPlugins) {
        sh.ln('-fs', '../' + x, x)
    }
    sh.cd('..')
}

console.info(`\nTotal: ${ms(Date.now() - overallStart)}`)
