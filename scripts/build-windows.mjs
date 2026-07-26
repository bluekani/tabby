#!/usr/bin/env node
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { build as builder } from 'electron-builder'
import * as vars from './vars.mjs'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const isTag = (process.env.GITHUB_REF || process.env.BUILD_SOURCEBRANCH || '').startsWith('refs/tags/')
const keypair = process.env.SM_KEYPAIR_ALIAS

process.env.ARCH = process.env.ARCH || process.arch

console.log('Signing enabled:', !!keypair)

function findVCRuntimeDir(arch) {
    const patterns = [
        `C:\\Program Files\\Microsoft Visual Studio\\2022\\*\\VC\\Redist\\MSVC\\*\\${arch}\\Microsoft.VC*.CRT`,
        `C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\*\\VC\\Redist\\MSVC\\*\\${arch}\\Microsoft.VC*.CRT`,
        `C:\\BuildTools\\VC\\Redist\\MSVC\\*\\${arch}\\Microsoft.VC*.CRT`,
    ]
    for (const pattern of patterns) {
        try {
            const escaped = pattern.replace(/'/g, `''`)
            const out = execSync(
                `powershell -NoProfile -Command "Get-ChildItem -Path '${escaped}' -Directory -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName"`,
                { encoding: 'utf-8' },
            ).trim()
            if (out) {
                console.log(`VC Runtime CRT dir: ${out}`)
                return out
            }
        } catch {
            // try next pattern
        }
    }
    return null
}

const crtDir = findVCRuntimeDir(process.env.ARCH)

builder({
    dir: true,
    win: ['nsis', 'zip'],
    arm64: process.env.ARCH === 'arm64',
    config: {
        extraMetadata: {
            version: vars.version,
        },
        afterPack: async (context) => {
            if (!crtDir || context.electronPlatformName !== 'win32') {
                return
            }
            const hasZip = context.targets.some(t => t.name === 'zip')
            for (const dll of ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll']) {
                const p = path.join(context.appOutDir, dll)
                if (hasZip) {
                    fs.copyFileSync(path.join(crtDir, dll), p)
                } else if (fs.existsSync(p)) {
                    fs.unlinkSync(p)
                }
            }
        },
        publish: process.env.KEYGEN_TOKEN ? [
            vars.keygenConfig,
            {
                provider: 'github',
                channel: `latest-${process.env.ARCH}`,
            },
        ] : undefined,
        forceCodeSigning: !!keypair,
        win: {
            signtoolOptions: {
                certificateSha1: process.env.SM_CODE_SIGNING_CERT_SHA1_HASH,
                publisherName: process.env.SM_PUBLISHER_NAME,
                signingHashAlgorithms: ['sha256'],
                sign: keypair ? async function (configuration) {
                    console.log('Signing', configuration)
                    if (configuration.path) {
                        try {
                            const cmd = `smctl sign --keypair-alias=${keypair} --input "${String(configuration.path)}"`
                            console.log(cmd)
                            const out = execSync(cmd)
                            if (out.toString().includes('FAILED')) {
                                throw new Error(out.toString())
                            }
                            console.log(out.toString())
                        } catch (e) {
                            console.error(`Failed to sign ${configuration.path}`)
                            if (e.stdout) {
                                console.error('stdout:', e.stdout.toString())
                            }
                            if (e.stderr) {
                                console.error('stderr:', e.stderr.toString())
                            }
                            console.error(e)
                            process.exit(1)
                        }
                    }
                } : undefined,
            },
        },
    },

    publish: (process.env.KEYGEN_TOKEN && isTag) ? 'always' : 'never',
}).catch(e => {
    console.error(e)
    process.exit(1)
})
