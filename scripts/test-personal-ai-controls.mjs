// Local portfolio embed: visible controls, usable dialogs and responsive layout.
// Requires the portfolio on :4321 and public chat on :5174.
import { chromium } from 'playwright'
import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
mkdirSync('output/playwright', {recursive:true})
try {
  for (const [name, viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844},compact:{width:320,height:568}})) {
    const context = await browser.newContext({viewport, permissions:['clipboard-read','clipboard-write']})
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('http://127.0.0.1:4321/projects')
    await page.locator('.pai-nav-trigger').click()
    await expect(page.locator('.pai-surface')).toHaveAttribute('data-ready','')
    const frame = page.frames().find(f=>f.url().includes(':5174/chat'))
    const button = label => frame.getByRole('button',{name:label,exact:true})
    const input = frame.getByRole('textbox',{name:'输入消息'})
    for (const label of ['新对话','历史','联系 Phil']) await expect(button(label)).toBeInViewport()
    await expect(frame.locator('.chat-disclosure')).toBeInViewport()
    await page.screenshot({path:`output/playwright/chat-controls-${name}-empty.png`})
    await input.fill('介绍一下 Phil')
    await button('发送消息').click()
    await expect(button('停止生成')).toBeVisible()
    await button('停止生成').click()
    await expect(button('重试回答')).toBeVisible()
    await button('重试回答').click()
    await expect(button('停止生成')).toHaveCount(0,{timeout:15000})
    await expect(frame.getByTestId('assistant-message')).toContainText('固定演示回答')
    await button('有帮助').click()
    await expect(button('有帮助')).toHaveAttribute('aria-pressed','true')
    await button('有问题').click()
    await expect(button('有问题')).toHaveAttribute('aria-pressed','true')
    await button('复制回答').click()
    await expect(button('复制回答')).toHaveAttribute('data-copied','true')
    // Only the top-level test page reads the clipboard; the embed needs write permission only.
    await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toContain('固定演示回答')
    for(const theme of ['light','dark']) {
      await page.evaluate(t=>document.documentElement.dataset.theme=t,theme)
      await expect(frame.locator('html')).toHaveClass(theme==='dark'?'dark':'')
      await page.screenshot({path:`output/playwright/chat-controls-${name}-${theme}.png`})
    }
    await button('联系 Phil').click()
    const dialog = frame.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button',{name:'保存演示留言'})).toBeVisible()
    const bounds = await dialog.boundingBox()
    const size = await frame.evaluate(()=>({width:innerWidth,height:innerHeight}))
    assert.ok(bounds.y>=0 && bounds.height<=size.height, 'Contact dialog fits the iframe')
    await dialog.getByRole('textbox',{name:'想聊什么？'}).fill('界面验证留言')
    await dialog.getByRole('button',{name:'保存演示留言'}).click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('.pai-dialog')).toBeVisible()
    await button('新对话').click()
    await expect(frame.getByTestId('user-message')).toHaveCount(0)
    await button('历史').click()
    await frame.getByRole('dialog').getByRole('button',{name:'介绍一下 Phil',exact:true}).click()
    await expect(frame.getByTestId('user-message')).toHaveCount(1)
    await expect(button('有问题')).toHaveAttribute('aria-pressed','true')
    await page.evaluate(()=>document.documentElement.dataset.locale='en')
    await expect(button('Leave a message')).toBeVisible()
    for(const label of ['New chat','History','Leave a message']) await expect(button(label)).toBeInViewport()
    assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow')
    await expect(frame.getByRole('textbox',{name:'Message input'})).toBeInViewport()
    await page.screenshot({path:`output/playwright/chat-controls-${name}-english.png`})
    assert.deepEqual(errors,[])
    await context.close()
    console.log(`${name}: visible toolbar, send/stop/retry/copy/feedback, contact, new chat/history, themes and English layout passed`)
  }
} finally { await browser.close() }
