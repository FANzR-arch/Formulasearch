import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { runContentChecks } from './check-content.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const node = process.execPath
const astro = join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs')
const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }

const contentStatus = runContentChecks()
if (contentStatus !== 0) process.exit(contentStatus)

const steps = [
  [node, [astro, 'check']],
  [node, [astro, 'build']],
  [node, ['scripts/check-site-output.mjs']],
]

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    windowsHide: true,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
