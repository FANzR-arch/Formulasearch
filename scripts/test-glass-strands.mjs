// Inspect rendered shader time and native pointer behavior; never calls a model.
import { chromium } from 'playwright'
import { expect } from '@playwright/test'
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'})
try {
 const page=await browser.newPage({viewport:{width:1440,height:960}})
 await page.addInitScript(()=>{
  const names=new WeakMap(),proto=WebGL2RenderingContext.prototype
  const locate=proto.getUniformLocation,write=proto.uniform1f
  proto.getUniformLocation=function(program,name){const loc=locate.call(this,program,name);if(loc)names.set(loc,name);return loc}
  proto.uniform1f=function(loc,value){if(names.get(loc)==='uTime'&&this.canvas.closest('.pai-strands'))window.strandsTime=value;return write.call(this,loc,value)}
 })
 await page.route('**/api/config',r=>r.fulfill({json:{mode:'mock'}}))
 await page.route('**/api/chat',r=>r.abort())
 await page.goto('http://127.0.0.1:4321/')
 await page.locator('#intro-overlay').waitFor({state:'hidden'})
 await page.locator('.pai-nav-trigger').click()
 await expect(page.locator('.pai-home')).toHaveAttribute('data-ready','')
 await expect(page.locator('html')).toHaveAttribute('data-ai-state','chat')
 const sample=async()=>{const before=await page.evaluate(()=>window.strandsTime);await page.waitForTimeout(400);return (await page.evaluate(()=>window.strandsTime))-before}
 const slow=await sample()
 const child=page.frames().find(f=>f.url().includes(':5174/chat'))
 const activity=value=>child.evaluate(responding=>parent.postMessage({type:'pai:activity',responding},'http://127.0.0.1:4321'),value)
 await activity(true);await page.waitForTimeout(1000)
 const fast=await sample()
 await activity(false);await page.waitForTimeout(1800)
 const recovered=await sample()
 expect(slow).toBeGreaterThan(0);expect(fast).toBeGreaterThan(slow*4);expect(recovered).toBeGreaterThan(0);expect(recovered).toBeLessThan(fast/3)
 console.log('Shader time per 400ms:',{slow,fast,recovered})
 await page.goto('http://127.0.0.1:4321/projects')
 await page.locator('.pai-nav-trigger').click()
 const card=page.locator('.pai-dialog')
 await expect(card).toHaveAttribute('data-ready','');await expect(card).not.toHaveAttribute('data-morphing','true')
 for(const theme of ['light','dark']) {
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme)
  await expect(page.locator('.pai-glass')).toHaveClass(/glass-surface--svg/)
  const hostFilters=await page.locator('.site-header,.pai-dialog').evaluateAll(els=>els.map(e=>getComputedStyle(e).backdropFilter))
  for(const filter of hostFilters){expect(filter).toContain('url(');expect(filter).toContain('blur(')}
  const box=await card.boundingBox()
  const read=()=>card.evaluate(c=>{const g=getComputedStyle(c.querySelector('.edge-light'));return {mask:g.maskImage,opacity:Number(g.opacity),hue:c.style.getPropertyValue('--glow-hue')}})
  await page.mouse.move(box.x+4,box.y+120);await page.waitForTimeout(300);const left=await read()
  await page.mouse.move(box.x+box.width-6,box.y+300);await page.waitForTimeout(300);const right=await read()
  expect(left.mask).not.toEqual(right.mask);expect(left.hue).not.toEqual(right.hue);expect(right.opacity).toBeGreaterThan(.8)
  await page.screenshot({path:`output/playwright/liquid-glass-${theme}.png`})
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(400);expect((await read()).opacity).toBeLessThan(.05)
 }
 await page.locator('.pai-close').click();await expect(card).not.toBeVisible()
 console.log('Glass host filters, iframe pointer color/cone, center fade and close passed')
} finally {await browser.close()}
