import { spawn, spawnSync } from 'node:child_process'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321'
const serverCommand = process.execPath
const serverArgs = ['scripts/serve-dist.mjs']
const playwrightCommand = process.execPath
const playwrightCli = `${process.cwd()}/node_modules/@playwright/test/cli.js`
const serverEnv = { ...process.env, PORT: new URL(baseUrl).port || '4321' }
let serverProcess

const isServerReady = async () => {
  try {
    const response = await fetch(baseUrl)
    return response.ok
  } catch {
    return false
  }
}

const stopServer = () => {
  if (!serverProcess || serverProcess.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(serverProcess.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
  } else {
    serverProcess.kill('SIGTERM')
  }
}

const run = async () => {
  const alreadyRunning = await isServerReady()
  if (!alreadyRunning) {
    serverProcess = spawn(serverCommand, serverArgs, {
      cwd: process.cwd(),
      env: serverEnv,
      stdio: 'inherit',
      windowsHide: true,
    })

    const deadline = Date.now() + 10_000
    while (Date.now() < deadline && !(await isServerReady())) await new Promise((resolve) => setTimeout(resolve, 100))
    if (!(await isServerReady())) throw new Error(`静态服务器未能启动：${baseUrl}`)
  }

  const result = spawnSync(playwrightCommand, [playwrightCli, 'test'], {
    cwd: process.cwd(),
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
    stdio: 'inherit',
    windowsHide: true,
  })
  if (result.error) throw result.error
  stopServer()
  process.exit(result.status ?? 1)
}

process.on('SIGINT', () => {
  stopServer()
  process.exit(1)
})
process.on('SIGTERM', () => {
  stopServer()
  process.exit(1)
})

run().catch((error) => {
  stopServer()
  console.error(error)
  process.exit(1)
})
