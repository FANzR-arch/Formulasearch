import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const source = path.join(projectRoot, 'content', 'blog')
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'formula-blog-content-'))
const fixture = path.join(root, 'blog')
const validator = path.join(projectRoot, 'scripts', 'prepare-blog-content.mjs')

const reset = async () => { await fs.rm(fixture, { recursive: true, force: true }); await fs.cp(source, fixture, { recursive: true }) }
const check = () => spawnSync(process.execPath, [validator, '--check'], { cwd: projectRoot, env: { ...process.env, BLOG_CONTENT_ROOT: fixture }, encoding: 'utf8' })
const expectFailure = async (label, mutate, pattern) => {
  await reset(); await mutate(); const result = check(); assert.notEqual(result.status, 0, `${label} should fail`); assert.match(`${result.stdout}\n${result.stderr}`, pattern)
}
const edit = async (entry, transform) => {
  const target = path.join(fixture, entry, 'index.md')
  await fs.writeFile(target, transform(await fs.readFile(target, 'utf8')), 'utf8')
}

try {
  await reset()
  assert.equal(check().status, 0, 'baseline should pass')

  await expectFailure('duplicate slug', async () => {
    const first = await fs.readFile(path.join(fixture, '2026-07-02', 'index.md'), 'utf8')
    const slug = first.match(/^slug:\s*(.+)$/m)[1]
    await edit('2026-06-27', (text) => text.replace(/^slug:.*$/m, `slug: ${slug}`))
  }, /slug 重复/)

  await expectFailure('missing cover alt', () => edit('2026-07-02', (text) => text.replace(/^coverAlt:.*\r?\n/m, '')), /缺少 coverAlt/)
  await expectFailure('index only without link', () => edit('2025-12-09', (text) => text.replace(/^externalLinks:[\s\S]*?(?=\r?\n---)/m, 'externalLinks: []')), /没有外链/)
  await expectFailure('raw strong html', () => edit('2026-07-02', (text) => `${text}\n<strong>legacy</strong>\n`), /旧 <strong>/)
  await expectFailure('external published image', () => edit('2026-07-02', (text) => `${text}\n![remote image](https://example.com/image.jpg)\n`), /已发布正文包含外部图片/)
  await expectFailure('missing local published image', () => edit('2026-07-02', (text) => `${text}\n![missing image](\/uploads\/blog\/2026-07-02\/missing.jpg)\n`), /本地图片不存在/)
  await expectFailure('published video without source', () => edit('2026-08-26', (text) => `${text}\n<video controls aria-label="test video" poster="/uploads/blog/2026-08-26/inline-WapUNwreT8XrM5C.jpg"><source type="video/mp4"></video>\n`), /视频缺少本地 source/)
  await expectFailure('published video with external poster', () => edit('2026-08-26', (text) => `${text}\n<video controls aria-label="test video" poster="https://example.com/poster.jpg"><source src="/uploads/blog/2026-08-26/video-01.mp4" type="video/mp4"></video>\n`), /外部视频 poster/)

  await reset()
  const newDirectory = path.join(fixture, '2026-08-25-test')
  await fs.mkdir(newDirectory)
  const template = await fs.readFile(path.join(fixture, '2025-12-09', 'index.md'), 'utf8')
  const draft = template
    .replace(/^sourceId:.*$/m, 'sourceId: "2026-08-25-test"')
    .replace(/^slug:.*$/m, 'slug: content-studio-test-draft')
    .replace(/^title:.*$/m, 'title: "Content Studio test draft"')
    .replace(/^draft:.*$/m, 'draft: true')
    .replace(/^externalLinks:[\s\S]*?(?=\r?\n---)/m, 'externalLinks: []')
  await fs.writeFile(path.join(newDirectory, 'index.md'), draft, 'utf8')
  assert.equal(check().status, 0, 'new draft article should pass')
  console.log('Blog content tests passed: baseline, new draft, duplicate slug, missing alt, index-only link, local image/video policy and Markdown compatibility.')
} finally {
  await fs.rm(root, { recursive: true, force: true })
}
