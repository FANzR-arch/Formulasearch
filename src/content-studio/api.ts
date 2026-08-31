import type { APIRoute } from 'astro'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { deletePhoto, importPhotoFiles, importPhotoFolder, readPhotoArchive, updatePhotoItems } from './photo-manager.mjs'

export const prerender = false
const projectRoot = path.resolve(import.meta.dirname, '..', '..')
const stateRoot = path.join(projectRoot, '.content-studio')
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
const git = (...args: string[]) => {
  const result = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8', windowsHide: true })
  return result.status === 0 ? result.stdout.trim() : result.stderr.trim()
}
const readOptional = async (target: string) => fsp.readFile(target, 'utf8').catch(() => '')

const startTask = async (name: 'prepare' | 'publish', args: string[], env: NodeJS.ProcessEnv = {}) => {
  await fsp.mkdir(stateRoot, { recursive: true })
  const taskPath = path.join(stateRoot, 'task.json')
  const current = JSON.parse(await readOptional(taskPath) || 'null')
  if (current?.running && current?.pid) {
    try { process.kill(current.pid, 0); throw new Error(`已有 ${current.name} 任务正在运行。`) } catch (error) {
      if (error instanceof Error && error.message.startsWith('已有')) throw error
    }
  }
  const logPath = path.join(stateRoot, `${name}.log`)
  const log = fs.openSync(logPath, 'w')
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
  })
  const state = { name, pid: child.pid, running: true, startedAt: new Date().toISOString(), logPath }
  await fsp.writeFile(taskPath, JSON.stringify(state, null, 2), 'utf8')
  child.once('exit', async (code) => {
    await fsp.writeFile(taskPath, JSON.stringify({ ...state, running: false, code, finishedAt: new Date().toISOString() }, null, 2), 'utf8')
  })
  child.unref()
  return state
}

export const GET: APIRoute = async ({ params }) => {
  try {
    if (params.action === 'photos') return json(await readPhotoArchive())
    if (params.action === 'status') {
      const prepare = JSON.parse(await readOptional(path.join(stateRoot, 'prepare-state.json')) || 'null')
      const task = JSON.parse(await readOptional(path.join(stateRoot, 'task.json')) || 'null')
      const taskLog = task?.name ? await readOptional(path.join(stateRoot, `${task.name}.log`)) : ''
      return json({
        branch: git('branch', '--show-current'),
        changes: git('status', '--short').split(/\r?\n/).filter(Boolean),
        diffStat: git('diff', '--stat'),
        prepare,
        task,
        taskLog: taskLog.slice(-12000),
      })
    }
    return json({ error: '未知接口。' }, 404)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
}

export const POST: APIRoute = async ({ params, request }) => {
  try {
    if (params.action === 'photos') {
      const contentType = request.headers.get('content-type') || ''
      if (contentType.includes('multipart/form-data')) {
        const form = await request.formData()
        const files = form.getAll('photos').filter((value): value is File => value instanceof File && value.size > 0)
        if (!files.length) throw new Error('没有选择图片。')
        const uploadRoot = path.join(stateRoot, 'photo-upload', String(Date.now()))
        await fsp.mkdir(uploadRoot, { recursive: true })
        const paths: string[] = []
        for (const [index, file] of files.entries()) {
          const extension = path.extname(file.name).toLowerCase()
          if (!/^\.(?:avif|jpe?g|png|webp)$/.test(extension)) throw new Error(`不支持的图片格式：${file.name}`)
          const target = path.join(uploadRoot, `${index}${extension}`)
          await fsp.writeFile(target, Buffer.from(await file.arrayBuffer()))
          paths.push(target)
        }
        try { return json(await importPhotoFiles(paths)) } finally { await fsp.rm(uploadRoot, { recursive: true, force: true }) }
      }
      const payload = await request.json()
      if (payload.action === 'import-folder') return json(await importPhotoFolder(payload.path))
      if (payload.action === 'update') return json(await updatePhotoItems(payload.items))
      if (payload.action === 'delete') return json(await deletePhoto(payload.assetHash))
      throw new Error('未知照片操作。')
    }
    if (params.action === 'prepare') return json(await startTask('prepare', ['run', 'content:prepare']))
    if (params.action === 'publish') {
      const payload = await request.json()
      if (payload.confirmDiff !== true || payload.confirmVercel !== true || payload.phrase !== 'PUBLISH MAIN') throw new Error('发布确认不完整。')
      if (!String(payload.verifyText || '').trim()) throw new Error('必须填写正式页面校验文字。')
      return json(await startTask('publish', ['run', 'content:publish', '--', '--confirmed'], {
        CONTENT_PUBLISH_VERIFY_PATH: String(payload.verifyPath || '/'),
        CONTENT_PUBLISH_VERIFY_TEXT: String(payload.verifyText),
      }))
    }
    return json({ error: '未知接口。' }, 404)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400)
  }
}
