import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const siteContentRoot = join(repoRoot, 'content', 'site')
const blogContentRoot = join(repoRoot, 'content', 'blog')
const routeManifest = JSON.parse(readFileSync(join(siteContentRoot, 'site-routes.json'), 'utf8'))
const strict = process.argv.includes('--strict')

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const localizedPairs = []
const collectLocalizedPairs = (value, path) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLocalizedPairs(item, `${path}[${index}]`))
    return
  }
  if (!isRecord(value)) return
  if (typeof value.zh === 'string' && typeof value.en === 'string') {
    localizedPairs.push(path)
    return
  }
  Object.entries(value).forEach(([key, child]) => collectLocalizedPairs(child, `${path}.${key}`))
}

const siteManifests = readdirSync(siteContentRoot)
  .filter((filename) => filename.endsWith('.json'))
  .sort()
for (const filename of siteManifests) {
  collectLocalizedPairs(JSON.parse(readFileSync(join(siteContentRoot, filename), 'utf8')), filename)
}

const readFrontmatterField = (frontmatter, field) => {
  const value = frontmatter.match(new RegExp(`^${field}:\\s*(.*)$`, 'm'))?.[1]?.trim() || ''
  if (!value || value === 'null' || value === '""' || value === "''") return ''
  return value.replace(/^(['"])(.*)\1$/, '$2').trim()
}

const blogDirectories = readdirSync(blogContentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
  .map((entry) => entry.name)
  .sort()

const posts = blogDirectories.map((directory) => {
  const path = join(blogContentRoot, directory, 'index.md')
  const markdown = readFileSync(path, 'utf8')
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || ''
  const get = (field) => readFrontmatterField(frontmatter, field)
  const contentLanguage = get('contentLanguage') || 'zh-Hans'
  const draft = get('draft') === 'true'
  return {
    contentLanguage,
    directory,
    draft,
    contentStatus: get('contentStatus'),
    titleEn: Boolean(get('titleEn')),
    descriptionEn: Boolean(get('descriptionEn')),
    coverAltEn: Boolean(get('coverAltEn')),
  }
})

const publicPosts = posts.filter((post) => !post.draft)
const publishedFullPosts = publicPosts.filter((post) => post.contentStatus === 'full')
const languageCounts = new Map()
for (const post of posts) languageCounts.set(post.contentLanguage, (languageCounts.get(post.contentLanguage) || 0) + 1)

const formatCoverage = (field) => {
  const count = publicPosts.filter((post) => post[field]).length
  return `${count}/${publicPosts.length}`
}

const contractFailures = posts.flatMap((post) => {
  if (post.contentLanguage !== 'en') return []
  return ['titleEn', 'descriptionEn', 'coverAltEn']
    .filter((field) => !post[field])
    .map((field) => `${post.directory}: English article is missing ${field}`)
})

console.log(`i18n report: ${localizedPairs.length} localized copy objects across ${siteManifests.length} site manifests.`)
console.log(`English SSR routes: ${(routeManifest.localized || []).length} manifest-backed pages under /en.`)
console.log(`Blog records: ${posts.length} total, ${publicPosts.length} public, ${publishedFullPosts.length} full, ${posts.length - publicPosts.length} draft.`)
console.log(`Blog content languages: ${[...languageCounts.entries()].map(([language, count]) => `${language}=${count}`).join(', ') || '(none)'}`)
console.log(`Public Blog English metadata coverage: titleEn ${formatCoverage('titleEn')}, descriptionEn ${formatCoverage('descriptionEn')}, coverAltEn ${formatCoverage('coverAltEn')}.`)
if (languageCounts.get('en')) console.log(`English article contract: ${languageCounts.get('en') - contractFailures.length}/${languageCounts.get('en')} records provide required English metadata.`)
else console.log('English article contract: no contentLanguage: en records are currently published or drafted.')

if (contractFailures.length) {
  console.error(contractFailures.map((failure) => `- ${failure}`).join('\n'))
  if (strict) process.exitCode = 1
}
