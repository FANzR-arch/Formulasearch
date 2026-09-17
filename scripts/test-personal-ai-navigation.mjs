import { chromium } from 'playwright'; import { expect } from '@playwright/test';
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
for(const mobile of [false,true]){
 const c=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 await c.addInitScript(()=>{ if(window===top) window.addEventListener('message', e=>{ if(e.data?.type==='pai:saved') e.stopImmediatePropagation(); }); });
 const p=await c.newPage();await p.goto('http://127.0.0.1:4321/');await p.locator('#intro-overlay').waitFor({state:'hidden'});
 await p.locator('[data-ai-avatar]:visible .home-avatar__frame').focus();await p.locator('[data-ai-avatar]:visible [data-ai-open]').click();
 await expect(p.locator('html')).toHaveAttribute('data-ai-state','chat');
 await expect(p.locator('.pai-home')).toHaveAttribute('data-ready','');
 await expect(p.locator('.skip-link')).toHaveAttribute('href','#personal-ai-home');
 await expect(p.locator('.pai-close')).toBeFocused();
 const f=p.frames().find(f=>f.url().includes(':5174/chat'));
 await expect(f.locator('.host-greeting p')).toContainText('聊聊你的想法');
 for(const theme of ['light','dark']){await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);await expect(f.locator('html')).toHaveClass(theme==='dark'?'dark':'');await p.waitForTimeout(300);await p.screenshot({path:'output/playwright/personal-ai-final-'+(mobile?'mobile':'desktop')+'-'+theme+'.png'});}
 if(mobile)await p.locator('#mobile-navigation-toggle').click();
 else await p.locator('.nav-disclosure').first().focus();
 await expect(p.locator('.site-header .nav-popover:visible').first()).toBeVisible().catch(async()=>{await expect(p.locator('#site-navigation')).toBeVisible()});
 if(mobile) await expect(p.locator('.site-header')).toHaveClass(/is-nav-open/); else await expect(p.locator('.nav-menu').first()).toHaveClass(/is-open/);
 await p.keyboard.press('Escape');
 await expect(p.locator('html')).toHaveAttribute('data-ai-state','chat');
 // Host save-timeout fallback: simulate a lost save acknowledgement, without blocking page navigation.

 if(mobile)await p.locator('#mobile-navigation-toggle').click();
 await p.locator('.nav-link[href="/projects"]').click();
 await p.waitForURL('http://127.0.0.1:4321/projects');
 await expect.poll(()=>p.evaluate(()=>sessionStorage.getItem('pai-save-warning'))).toBe('1');
 await p.locator('.pai-nav-trigger').click();
 await expect(p.frameLocator('iframe').locator('.host-recovery')).toContainText('未确认保存');
 console.log((mobile?'Mobile':'Desktop')+': final visuals, navigable header, Escape precedence and save timeout passed');
 await c.close();
}
} finally {await b.close();}
