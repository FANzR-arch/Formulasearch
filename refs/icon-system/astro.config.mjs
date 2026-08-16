import { defineConfig } from 'astro/config'
import { resolve } from 'node:path'

export default defineConfig({
  root: resolve(process.cwd(), 'refs/icon-system'),
  output: 'static',
  trailingSlash: 'never',
  vite: {
    server: {
      fs: { allow: [resolve(process.cwd())] },
    },
  },
})
