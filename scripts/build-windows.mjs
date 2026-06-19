#!/usr/bin/env node
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { build as builder } from 'electron-builder'
import * as vars from './vars.mjs'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const isTag = (process.env.GITHUB_REF || process.env.BUILD_SOURCEBRANCH || '').startsWith('refs/tags/')
const keypair = process.env.SM_KEYPAIR_ALIAS

process.env.ARCH = process.env.ARCH || process.arch

console.log('Signing enabled:', !!keypair)

const buildConfig = {
    dir: true,
    arm64: process.env.ARCH === 'arm64',
    config: {
        extraMetadata: {
            version: vars.version,
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
}

try {
    // Build portable ZIP
    console.log('Building portable ZIP...')
    await builder({ ...buildConfig, win: ['zip'] })

    // Remove vc-runtime folder for installer build
    const vcRuntimePath = path.join('app', 'vc-runtime')
    if (fs.existsSync(vcRuntimePath)) {
        fs.rmSync(vcRuntimePath, { recursive: true, force: true })
        console.log('Removed vc-runtime folder')
    }

    // Build NSIS installer (without VC runtime DLLs)
    console.log('Building NSIS installer...')
    await builder({ ...buildConfig, win: ['nsis'] })

} catch (e) {
    console.error(e)
    process.exit(1)
}
