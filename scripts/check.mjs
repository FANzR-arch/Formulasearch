import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const astro = join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs')
const result = spawnSync(process.execPath, [astro, 'check'], {
  cwd: projectRoot,
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit',
  windowsHide: true,
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
