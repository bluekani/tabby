// Rspack config for tabby-ssh. See ../rspack.plugin.config.mjs for details.
import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

import config from '../rspack.plugin.config.mjs'

export default () => config({
    name: 'ssh',
    dirname: __dirname,
})
