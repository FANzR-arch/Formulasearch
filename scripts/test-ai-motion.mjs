// Uses the real embedded UI with the local mock adapter; no model API calls.
import { chromium } from 'playwright'
import { expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
mkdirSync('output/playwright', { recursive:true })
try {
  for (const mobile of [false,true]) {
    const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960}})
    await context.route('**/api/config',r=>r.fulfill({json:{mode:'mock'}}))
    await context.route('**/api/chat',r=>r.abort())
    const page = await context.newPage()
    const errors=[]; page.on('pageerror',e=>errors.push(e.message))
    await page.goto('http://127.0.0.1:4321/')
    await page.locator('#intro-overlay').waitFor({state:'hidden'})
    await page.locator('.pai-nav-trigger').click()
    await expect(page.locator('html')).toHaveAttribute('data-ai-state','chat')
    await expect(page.locator('.pai-home')).toHaveAttribute('data-ready','')
    const frame = page.frameLocator('.pai-home iframe')
    await expect(frame.getByRole('textbox',{name:'输入消息'})).toBeVisible()
    await expect(page.locator('.pai-strands')).toHaveAttribute('data-running','true')
    await frame.getByRole('textbox',{name:'输入消息'}).fill('介绍一下 Phil')
    await frame.getByRole('button',{name:'发送消息',exact:true}).click()
    await expect(page.locator('.pai-home')).toHaveAttribute('data-responding','')
    await expect(page.locator('.pai-strands')).toHaveAttribute('data-running','true')
    await frame.getByRole('button',{name:'停止生成',exact:true}).click()
    await expect(page.locator('.pai-home')).not.toHaveAttribute('data-responding','')
    await expect(page.locator('.pai-strands')).toHaveAttribute('data-running','true')
    for (const theme of ['light','dark']) {
      await page.evaluate(t=>document.documentElement.dataset.theme=t,theme)
      await page.waitForTimeout(500)
      await page.screenshot({path:`output/playwright/motion-home-${mobile?'mobile':'desktop'}-${theme}.png`})
    }
    await page.locator('.pai-close').click()
    await expect(page.locator('html')).toHaveAttribute('data-ai-state','intro')
    await page.goto('http://127.0.0.1:4321/projects')
    await page.locator('.pai-nav-trigger').click()
    await expect(page.locator('.pai-dialog')).toHaveAttribute('data-ready','')
    await expect(page.locator('.pai-dialog')).not.toHaveAttribute('data-morphing','true')
    for (const theme of ['light','dark']) {
      await page.evaluate(t=>document.documentElement.dataset.theme=t,theme)
      await page.waitForTimeout(500)
      await page.screenshot({path:`output/playwright/motion-panel-${mobile?'mobile':'desktop'}-${theme}.png`})
    }
    await page.locator('.pai-close').click()
    await expect(page.locator('.pai-dialog')).not.toBeVisible()
    expect(errors).toEqual([])
    await context.close()
    console.log(`${mobile?'Mobile':'Desktop'}: idle/output/stop, home return, panel open/close and themes passed`)
  }
  const context=await browser.newContext({reducedMotion:'reduce'})
  await context.route('**/api/config',r=>r.fulfill({json:{mode:'mock'}}))
  const page=await context.newPage()
  await page.goto('http://127.0.0.1:4321/')
  await page.locator('.pai-nav-trigger').click()
  await expect(page.locator('html')).toHaveAttribute('data-ai-state','chat')
  await expect(page.locator('.pai-strands')).toHaveAttribute('data-running','false')
  const child=page.frames().find(f=>f.url().includes(':5174/chat'))
  await child.evaluate(()=>parent.postMessage({type:'pai:activity',responding:true},'http://127.0.0.1:4321'))
  await expect(page.locator('.pai-home')).toHaveAttribute('data-responding','')
  await expect(page.locator('.pai-strands')).toHaveAttribute('data-running','false')
  console.log('Reduced motion: output does not start continuous rendering')
  await context.close()
} finally { await browser.close() }
