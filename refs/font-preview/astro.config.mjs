import { defineConfig } from 'astro/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  publicDir: resolve(projectRoot, 'public'),
  output: 'static',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  vite: {
    server: { fs: { allow: [projectRoot] } },
  },
})
