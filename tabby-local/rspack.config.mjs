// Rspack config for tabby-local. See ../rspack.plugin.config.mjs for details.
import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

import config from '../rspack.plugin.config.mjs'

export default () => config({
    name: 'local',
    dirname: __dirname,
})
