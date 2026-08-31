import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const stateDirectory = path.join(projectRoot, '.content-studio')
const statePath = path.join(stateDirectory, 'prepare-state.json')
const previewPort = Number(process.env.CONTENT_PREVIEW_PORT || 4322)
const noPreview = process.argv.includes('--no-preview')
const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', CONTENT_STUDIO: '0' }

const run = (label, command, args) => {
  console.log(`\n[${label}]`)
  const result = spawnSync(command, args, { cwd: projectRoot, env, stdio: 'inherit', windowsHide: true })
  if (result.error) throw new Error(`${label} 无法启动：${result.error.message}`)
  if (result.status !== 0) throw new Error(`${label} 失败，准备预览已停止。`)
}

const git = (...args) => {
  const result = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} 失败。`)
  return result.stdout
}

const isPortOpen = (port) => new Promise((resolve) => {
  const socket = net.createConnection({ host: '127.0.0.1', port })
  socket.once('connect', () => { socket.destroy(); resolve(true) })
  socket.once('error', () => resolve(false))
  socket.setTimeout(800, () => { socket.destroy(); resolve(false) })
})

await fsp.mkdir(stateDirectory, { recursive: true })
await fsp.rm(statePath, { force: true })

run('Blog 封面媒体', process.execPath, ['scripts/prepare-blog-media.mjs', '--write'])
run('Blog 图片尺寸', process.execPath, ['scripts/prepare-blog-image-dimensions.mjs', '--write'])
run('完整内容、类型与静态构建', process.execPath, ['scripts/build.mjs'])

for (const forbidden of ['content-studio', 'keystatic', path.join('api', 'content-studio'), path.join('api', 'keystatic')]) {
  if (fs.existsSync(path.join(projectRoot, 'dist', forbidden))) throw new Error(`生产 dist 不应包含本地后台路由：${forbidden}`)
}

const status = git('status', '--porcelain=v1', '-z')
const state = {
  preparedAt: new Date().toISOString(),
  head: git('rev-parse', 'HEAD').trim(),
  branch: git('branch', '--show-current').trim(),
  statusHash: createHash('sha256').update(status).digest('hex'),
  changedFiles: status.split('\0').filter(Boolean),
  previewUrl: `http://127.0.0.1:${previewPort}`,
  productionRoutesExcluded: true,
}
await fsp.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')

if (!noPreview && !await isPortOpen(previewPort)) {
  const log = fs.openSync(path.join(stateDirectory, 'preview.log'), 'a')
  const child = spawn(process.execPath, ['scripts/serve-dist.mjs'], {
    cwd: projectRoot,
    env: { ...env, PORT: String(previewPort) },
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
  })
  child.unref()
  state.previewPid = child.pid
  await fsp.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

console.log(`\n准备预览完成：${state.previewUrl}`)
console.log(`待确认变更：${state.changedFiles.length} 项。没有执行 git add、commit 或 push。`)
