import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

const defaultEdgePath = process.platform === 'win32'
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  : ''
const browserPath = process.env.PLAYWRIGHT_BROWSER_PATH || defaultEdgePath
const launchOptions = browserPath && existsSync(browserPath) ? { executablePath: browserPath } : undefined

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['line'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321',
    browserName: 'chromium',
    headless: true,
    ...(launchOptions ? { launchOptions } : {}),
  },
})
