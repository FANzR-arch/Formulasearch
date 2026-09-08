// Runs the existing content commands with Node; serializes launch/state changes within this Studio process.
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

export const createTaskRunner = ({ projectRoot, stateRoot }) => {
  const taskPath = path.join(stateRoot, 'task.json')
  let pending = Promise.resolve()
  const serialize = (operation) => {
    const result = pending.then(operation)
    pending = result.catch(() => {})
    return result
  }
  const readState = async () => {
    try { return JSON.parse(await fsp.readFile(taskPath, 'utf8')) }
    catch (error) { if (error.code === 'ENOENT') return null; throw error }
  }
  const writeState = async (state) => {
    const temporary = `${taskPath}.${randomUUID()}.tmp`
    try {
      await fsp.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' })
      await fsp.rename(temporary, taskPath)
    } finally { await fsp.rm(temporary, { force: true }) }
  }

  return (name, env = {}) => serialize(async () => {
    if (name !== 'prepare' && name !== 'publish') throw new Error('未知后台任务。')
    await fsp.mkdir(stateRoot, { recursive: true })
    const current = await readState()
    if (current?.running && current.pid) {
      let alive = true
      try { process.kill(current.pid, 0) }
      catch (error) { if (error.code === 'ESRCH') alive = false; else throw error }
      if (alive) throw new Error(`已有 ${current.name} 任务正在运行。`)
    }
    const state = { id: randomUUID(), name, running: true, startedAt: new Date().toISOString(), logPath: path.join(stateRoot, `${name}.log`) }
    const args = [path.join(projectRoot, 'scripts', `content-${name}.mjs`), ...(name === 'publish' ? ['--confirmed'] : [])]
    const log = fs.openSync(state.logPath, 'w')
    let child
    try {
      child = spawn(process.execPath, args, { cwd: projectRoot, env: { ...process.env, ...env }, detached: true, stdio: ['ignore', log, log], windowsHide: true })
      // Attach both handlers before any await: even an immediately exiting child must be recorded.
      const spawned = new Promise((resolve, reject) => {
        child.once('spawn', resolve)
        child.once('error', reject)
      })
      child.once('exit', (code, signal) => {
        serialize(async () => {
          const latest = await readState()
          if (latest?.id !== state.id || !latest.running) return
          await writeState({ ...state, running: false, code, signal, finishedAt: new Date().toISOString() })
        }).catch((error) => console.error('无法保存后台任务结束状态：', error))
      })
      await spawned
      state.pid = child.pid
      await writeState(state)
      child.unref()
      return state
    } catch (error) {
      if (child?.pid) child.kill()
      await writeState({ ...state, running: false, code: null, error: error.message, finishedAt: new Date().toISOString() })
      throw new Error(`无法启动 ${name}：${error.message}`)
    } finally {
      fs.closeSync(log)
    }
  })
}
