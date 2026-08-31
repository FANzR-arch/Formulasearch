import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline/promises'
import process from 'node:process'

const projectRoot = path.resolve(import.meta.dirname, '..')
const statePath = path.join(projectRoot, '.content-studio', 'prepare-state.json')
const confirmed = process.argv.includes('--confirmed')
const allowedPath = /^(?:content\/|public\/uploads\/|src\/assets\/archive\/architecture\/)/

const git = (...args) => {
  const result = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} 失败。`)
  return result.stdout
}
const statusSource = () => git('status', '--porcelain=v1', '-z')
const parseStatus = (source) => {
  const parts = source.split('\0').filter(Boolean)
  const entries = []
  for (let index = 0; index < parts.length; index += 1) {
    const line = parts[index]
    const status = line.slice(0, 2)
    const entry = { status, path: line.slice(3).replaceAll('\\', '/') }
    if (/[RC]/.test(status)) entry.originalPath = parts[++index]?.replaceAll('\\', '/')
    entries.push(entry)
  }
  return entries
}
const question = readline.createInterface({ input: process.stdin, output: process.stdout })
const requirePhrase = async (prompt, phrase) => {
  const answer = (await question.question(`${prompt}\n输入 ${phrase}：`)).trim()
  if (answer !== phrase) throw new Error('确认文字不匹配，已取消发布。')
}

try {
  const state = JSON.parse(await fs.readFile(statePath, 'utf8'))
  const currentStatus = statusSource()
  const currentHash = createHash('sha256').update(currentStatus).digest('hex')
  if (currentHash !== state.statusHash) throw new Error('准备预览后工作区又发生变化，请重新运行 npm run content:prepare。')
  if (git('rev-parse', 'HEAD').trim() !== state.head) throw new Error('准备预览后 HEAD 已变化，请重新准备。')
  if (git('branch', '--show-current').trim() !== 'main') throw new Error('自动发布只允许在 main 分支运行。')
  const remote = git('remote', 'get-url', 'origin').trim().replace(/\.git$/, '')
  if (!/github\.com[/:]FANzR-arch\/Formulasearch$/i.test(remote)) throw new Error(`origin 不是预期仓库：${remote}`)
  if (git('diff', '--cached', '--name-only').trim()) throw new Error('暂存区已有文件；为避免混入其他提交，自动发布已拒绝。')

  const entries = parseStatus(currentStatus)
  const unrelated = entries.filter((entry) => !allowedPath.test(entry.path) || (entry.originalPath && !allowedPath.test(entry.originalPath)))
  if (unrelated.length) throw new Error(`检测到内容范围外的代码或配置变更，拒绝自动发布：\n${unrelated.map((entry) => `- ${entry.status} ${entry.path}`).join('\n')}`)
  if (!entries.length) throw new Error('没有可发布的内容变更。')

  console.log('\n即将发布的 Git diff：')
  console.log(git('diff', '--stat'))
  console.log(entries.map((entry) => `${entry.status} ${entry.originalPath ? `${entry.originalPath} -> ` : ''}${entry.path}`).join('\n'))

  let verifyPath = process.env.CONTENT_PUBLISH_VERIFY_PATH || '/'
  let verifyText = process.env.CONTENT_PUBLISH_VERIFY_TEXT || ''
  if (!confirmed) {
    await requirePhrase('确认以上新增、修改和删除均属于本次内容更新。', 'STAGE CONTENT')
    const integrationMarker = path.join(projectRoot, '.vercel', 'project.json')
    try { await fs.access(integrationMarker) } catch { throw new Error('缺少 .vercel/project.json；首次发布前请先核对 Vercel Git Integration。') }
    await requirePhrase('确认 Vercel 项目已连接 FANzR-arch/Formulasearch，Production Branch 为 main。', 'VERCEL MAIN')
    verifyPath = (await question.question('要验证的正式页面路径（例如 /blog/slug）：')).trim() || '/'
    verifyText = (await question.question('该页面发布后必须包含的唯一文字：')).trim()
    if (!verifyText) throw new Error('必须提供正式页面内容校验文字。')
    await requirePhrase('最后确认：这会创建 commit 并 push origin/main。', 'PUBLISH MAIN')
  } else if (!verifyText) {
    throw new Error('后台确认发布必须提供 CONTENT_PUBLISH_VERIFY_TEXT。')
  }

  const paths = entries.flatMap((entry) => [entry.path, entry.originalPath].filter(Boolean))
  const add = spawnSync('git', ['add', '--', ...paths], { cwd: projectRoot, encoding: 'utf8', windowsHide: true })
  if (add.status !== 0) throw new Error(add.stderr || '暂存内容文件失败。')
  const message = `content: publish ${new Date().toISOString().slice(0, 10)}`
  const commit = spawnSync('git', ['commit', '-m', message], { cwd: projectRoot, encoding: 'utf8', windowsHide: true })
  if (commit.status !== 0) throw new Error(commit.stderr || '创建内容提交失败。')
  const push = spawnSync('git', ['push', 'origin', 'main'], { cwd: projectRoot, encoding: 'utf8', windowsHide: false })
  if (push.status !== 0) throw new Error(push.stderr || 'push origin/main 失败；commit 已保留在本地。')

  const site = JSON.parse(await fs.readFile(path.join(projectRoot, 'content', 'site', 'site.json'), 'utf8'))
  const target = new URL(verifyPath, site.siteUrl).toString()
  let verified = false
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 2_000 : 10_000))
    try {
      const response = await fetch(target, { redirect: 'follow' })
      const html = await response.text()
      if (response.ok && html.includes(verifyText)) { verified = true; break }
    } catch {}
  }
  console.log(`GitHub Actions: https://github.com/FANzR-arch/Formulasearch/actions`)
  console.log('Vercel: https://vercel.com/dashboard')
  if (!verified) throw new Error(`已 push，但正式页面尚未通过内容验证：${target}`)
  console.log(`发布完成：${target}`)
} finally {
  question.close()
}
