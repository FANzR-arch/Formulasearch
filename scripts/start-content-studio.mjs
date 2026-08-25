import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const astro = join(projectRoot, 'node_modules', 'astro', 'bin', 'astro.mjs')

const child = spawn(process.execPath, [astro, 'dev', '--host', '127.0.0.1', '--open', '/content-studio'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
    CONTENT_STUDIO: '1',
  },
  stdio: 'inherit',
  windowsHide: false,
})

child.on('error', (error) => {
  console.error(`内容后台启动失败：${error.message}`)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
