import { expect, test } from '@playwright/test'

test.skip(!process.env.CONTENT_STUDIO_BASE_URL, 'Requires a local Content Studio preview; all photo API requests are intercepted.')

const archive = {
  revision: 'fixture-revision',
  items: [{ assetHash: 'a'.repeat(64), image: '/uploads/photos/select/photo-001.webp', index: '01', width: 1200, height: 800, alt: { zh: '测试照片', en: 'Test photo' }, tags: ['test'] }],
}

test('upload keeps its success message, resets the form and prevents duplicate submission', async ({ page }) => {
  let posts = 0
  let releaseUpload
  const uploading = new Promise((resolve) => { releaseUpload = resolve })
  await page.route('**/api/content-studio/photos', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: archive })
    posts++
    expect(route.request().postData()).toContain('fixture.png')
    await uploading
    return route.fulfill({ json: { imported: 1, duplicates: 2, total: 1 } })
  })
  await page.goto(`${process.env.CONTENT_STUDIO_BASE_URL}/content-studio/photos`)
  await expect(page.locator('#count')).toHaveText('1 张照片')
  await page.locator('#photo-files').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('intercepted upload fixture') })
  await page.locator('#upload-form button').click()
  await expect(page.locator('#upload-form button')).toBeDisabled()
  await expect(page.locator('#save')).toBeDisabled()
  await page.locator('#upload-form').dispatchEvent('submit')
  expect(posts).toBe(1)
  releaseUpload()
  await expect(page.locator('#status')).toContainText('导入 1 张，跳过 2 张重复图片')
  await expect(page.locator('#status')).toHaveAttribute('data-kind', 'success')
  await expect(page.locator('#photo-files')).toHaveValue('')
  await expect(page.locator('#upload-form button')).toBeEnabled()
  await expect(page.locator('#save')).toBeEnabled()
})

test('upload errors preserve file selection and re-enable the controls', async ({ page }) => {
  await page.route('**/api/content-studio/photos', (route) => route.fulfill(route.request().method() === 'GET'
    ? { json: archive }
    : { status: 400, json: { error: '测试导入失败，请重试。' } }))
  await page.goto(`${process.env.CONTENT_STUDIO_BASE_URL}/content-studio/photos`)
  await expect(page.locator('#count')).toHaveText('1 张照片')
  await page.locator('#photo-files').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('intercepted upload fixture') })
  await page.locator('#upload-form button').click()
  await expect(page.locator('#status')).toHaveText('测试导入失败，请重试。')
  await expect(page.locator('#status')).toHaveAttribute('data-kind', 'error')
  await expect(page.locator('#photo-files')).not.toHaveValue('')
  await expect(page.locator('#upload-form button')).toBeEnabled()
})

test('saving sends the revision and a conflict preserves the unsaved text', async ({ page }) => {
  await page.route('**/api/content-studio/photos', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: archive })
    const body = route.request().postDataJSON()
    expect(body.revision).toBe(archive.revision)
    expect(body.items[0].alt.zh).toBe('保留这段尚未保存的文字')
    return route.fulfill({ status: 409, json: { error: '照片清单已被其他操作更新。' } })
  })
  await page.goto(`${process.env.CONTENT_STUDIO_BASE_URL}/content-studio/photos`)
  await expect(page.locator('#count')).toHaveText('1 张照片')
  await page.locator('[data-zh]').fill('保留这段尚未保存的文字')
  await page.locator('#save').click()
  await expect(page.locator('#status')).toHaveText('照片清单已被其他操作更新。')
  await expect(page.locator('[data-zh]')).toHaveValue('保留这段尚未保存的文字')
  await expect(page.locator('#save')).toBeEnabled()
})
