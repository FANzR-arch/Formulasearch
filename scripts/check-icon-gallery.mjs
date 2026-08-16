import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const astro = join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs')
const outputDir = join(projectRoot, '.astro-icon-gallery-check')
if (existsSync(outputDir)) rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })

const result = spawnSync(process.execPath, [astro, 'build', '--root', 'refs/icon-system', '--outDir', outputDir], {
  cwd: projectRoot,
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit',
  windowsHide: true,
})

rmSync(outputDir, { recursive: true, force: true })
if (result.error) throw result.error
process.exit(result.status ?? 1)
