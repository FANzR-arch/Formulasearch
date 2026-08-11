import { defineConfig } from '@playwright/test'

const edgePath = process.env.PLAYWRIGHT_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['line'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    browserName: 'chromium',
    headless: true,
    launchOptions: { executablePath: edgePath },
  },
  webServer: {
    command: 'npm.cmd run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ASTRO_DEV_BACKGROUND: '0',
      ASTRO_TELEMETRY_DISABLED: '1',
    },
  },
})
