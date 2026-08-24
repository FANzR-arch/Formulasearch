import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(projectRoot, 'src')
const iconSystemRoot = join(sourceRoot, 'components', 'icon-system')

const collectFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name)
  if (entry.isDirectory()) return collectFiles(path)
  return /\.(astro|ts|tsx|js|mjs|css)$/.test(entry.name) ? [path] : []
})

const directLucideImports = collectFiles(sourceRoot)
  .filter((path) => !path.startsWith(iconSystemRoot))
  .filter((path) => /from\s+['"]@lucide\/astro['"]/.test(readFileSync(path, 'utf8')))

if (directLucideImports.length > 0) {
  console.error('Icon system violation: import @lucide/astro only from src/components/icon-system/.')
  directLucideImports.forEach((path) => console.error(`- ${path}`))
  process.exit(1)
}

const astro = join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs')
const result = spawnSync(process.execPath, [astro, 'check'], {
  cwd: projectRoot,
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit',
  windowsHide: true,
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
