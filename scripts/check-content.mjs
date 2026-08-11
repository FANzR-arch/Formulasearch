import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const scriptPath = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(scriptPath), '..')
const node = process.execPath
const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }

const contentChecks = [
  ['Blog content', [node, ['scripts/prepare-blog-content.mjs', '--check']]],
  ['i18n coverage', [node, ['scripts/report-i18n.mjs', '--strict']]],
  ['color contrast', [node, ['scripts/check-color-contrast.mjs']]],
  ['Blog media', [node, ['scripts/prepare-blog-media.mjs', '--check']]],
  ['Blog image alt', [node, ['scripts/prepare-blog-image-alt.mjs', '--check']]],
  ['Blog image dimensions', [node, ['scripts/prepare-blog-image-dimensions.mjs', '--check']]],
  ['Photo archive regression', [node, ['scripts/test-photo-archive.mjs']]],
]

export function runContentChecks() {
  for (const [label, [command, args]] of contentChecks) {
    const result = spawnSync(command, args, {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
      windowsHide: true,
    })
    if (result.error) throw new Error(`${label} check failed to start: ${result.error.message}`)
    if (result.status !== 0) return result.status ?? 1
  }
  return 0
}

if (path.resolve(process.argv[1] ?? '') === scriptPath) {
  process.exit(runContentChecks())
}
