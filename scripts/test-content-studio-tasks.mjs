import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createTaskRunner } from '../src/content-studio/task-runner.mjs'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'formula studio task '))
const stateRoot = path.join(root, 'state')
const taskPath = path.join(stateRoot, 'task.json')
const readState = async () => JSON.parse(await fs.readFile(taskPath, 'utf8'))
const waitForExit = async () => {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    const state = await readState()
    if (!state.running) return state
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('Test task did not finish')
}

try {
  await fs.mkdir(path.join(root, 'scripts'))
  const stub = "console.log(JSON.stringify({ args: process.argv.slice(2), text: process.env.TEST_TASK_TEXT })); setTimeout(() => process.exit(Number(process.env.TEST_TASK_EXIT || 0)), 300)"
  await fs.writeFile(path.join(root, 'scripts/content-prepare.mjs'), stub)
  await fs.writeFile(path.join(root, 'scripts/content-publish.mjs'), stub)
  const startTask = createTaskRunner({ projectRoot: root, stateRoot })
  const text = 'literal spaces & $(not-a-command)'
  const attempts = await Promise.allSettled([startTask('prepare', { TEST_TASK_TEXT: text }), startTask('publish')])
  assert.deepEqual(attempts.map((result) => result.status), ['fulfilled', 'rejected'])
  assert.match(attempts[1].reason.message, /正在运行/)
  assert.equal((await waitForExit()).code, 0)
  const output = JSON.parse((await fs.readFile(path.join(stateRoot, 'prepare.log'), 'utf8')).trim())
  assert.deepEqual(output, { args: [], text })

  await startTask('publish', { TEST_TASK_EXIT: '7', TEST_TASK_TEXT: text })
  assert.equal((await waitForExit()).code, 7)
  assert.deepEqual(JSON.parse((await fs.readFile(path.join(stateRoot, 'publish.log'), 'utf8')).trim()).args, ['--confirmed'])
  await fs.writeFile(path.join(root, 'scripts/content-prepare.mjs'), 'process.exit(0)')
  await startTask('prepare')
  assert.equal((await waitForExit()).code, 0)

  const failureRoot = path.join(root, 'spawn-failure')
  const failTask = createTaskRunner({ projectRoot: path.join(root, 'missing-directory'), stateRoot: failureRoot })
  await assert.rejects(failTask('prepare'), /无法启动/)
  const failure = JSON.parse(await fs.readFile(path.join(failureRoot, 'task.json'), 'utf8'))
  assert.equal(failure.running, false)
  assert.match(failure.error, /ENOENT/)
  assert.equal((await fs.readdir(stateRoot)).some((name) => name.endsWith('.tmp')), false)
  console.log('Content Studio task test passed: real Node launch in a spaced path, duplicate rejection, literal environment, publish stub arguments, fast exit, failing exit and spawn failure. No real content command was executed.')
} finally {
  assert(path.resolve(root).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`))
  await fs.rm(root, { recursive: true, force: true })
}
