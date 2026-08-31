import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const contentRoot = join(repoRoot, 'content', 'blog')
const mediaPolicyPath = join(repoRoot, 'content', 'site', 'blog-media-policy.json')
const dimensionsManifestPath = join(repoRoot, 'content', 'site', 'blog-image-dimensions.json')
const mediaPolicy = JSON.parse(readFileSync(mediaPolicyPath, 'utf8'))
if (!Array.isArray(mediaPolicy.externalImageHosts) || mediaPolicy.externalImageHosts.some((host) => typeof host !== 'string' || !host.trim())) {
  throw new Error(`Invalid blog media policy: ${mediaPolicyPath}`)
}
if (!Number.isInteger(mediaPolicy.maxExternalImagesWithoutDimensions) || mediaPolicy.maxExternalImagesWithoutDimensions < 0) {
  throw new Error(`Invalid blog media policy maxExternalImagesWithoutDimensions: ${mediaPolicyPath}`)
}
const approvedExternalImageHosts = new Set(mediaPolicy.externalImageHosts.map((host) => host.trim().toLowerCase()))
const dimensionsManifest = JSON.parse(readFileSync(dimensionsManifestPath, 'utf8').replace(/^\uFEFF/, ''))
if (dimensionsManifest?.version !== 1 || !dimensionsManifest?.images || typeof dimensionsManifest.images !== 'object' || Array.isArray(dimensionsManifest.images)) {
  throw new Error(`Invalid blog image dimensions manifest: ${dimensionsManifestPath}`)
}
for (const [source, value] of Object.entries(dimensionsManifest.images)) {
  if (!/^(?:https:\/\/|\/)/i.test(source) || !Number.isInteger(value?.width) || !Number.isInteger(value?.height) || value.width <= 0 || value.height <= 0) {
    throw new Error(`Invalid blog image dimensions: ${source}`)
  }
}
const genericAlt = new Set(['', '图像', 'image', 'Image'])

const cleanHeading = (value) => value
  .replace(/<[^>]+>/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[\*_`]/g, '')
  .replace(/\s+#*$/, '')
  .trim()

const readTitle = (markdown) => {
  const match = markdown.match(/^title:\s*["'](.+?)["']\s*$/m)
  return match?.[1]?.trim() || '文章'
}

const readFrontmatterValue = (markdown, field) => {
  const match = markdown.match(new RegExp(`^${field}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\r\\n]+))\\s*$`, 'm'))
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim()
}

const normalizeImageSource = (value) => value
  .trim()
  .replace(/^<|>$/g, '')
  .split(/\s+/, 1)[0]

const getImageDependency = (source) => {
  const normalizedSource = normalizeImageSource(source)
  if (!normalizedSource) return { kind: 'unknown', source: normalizedSource }
  if (normalizedSource.startsWith('/')) return { kind: 'local', source: normalizedSource }
  try {
    const url = new URL(normalizedSource)
    return { kind: 'external', host: url.hostname, protocol: url.protocol, source: normalizedSource }
  } catch {
    return { kind: 'unknown', source: normalizedSource }
  }
}

const transform = (markdown) => {
  const lines = markdown.split(/\r?\n/)
  let inFrontmatter = false
  let frontmatterSeen = false
  let inFence = false
  let currentHeading = readTitle(markdown)
  let replacements = 0
  let invalidAltCount = 0
  const images = []

  const output = lines.map((line, index) => {
    if (line.trim() === '---' && !frontmatterSeen) {
      inFrontmatter = true
      frontmatterSeen = true
      return line
    }
    if (line.trim() === '---' && inFrontmatter) {
      inFrontmatter = false
      return line
    }
    if (inFrontmatter) return line

    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      return line
    }
    if (inFence) return line

    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/)
    if (heading) currentHeading = cleanHeading(heading[1]) || currentHeading

    for (const match of line.matchAll(/<img\b[^>]*>/gi)) {
      const tag = match[0]
      const altMatch = tag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
      const sourceMatch = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
      const alt = (altMatch?.[1] ?? altMatch?.[2] ?? altMatch?.[3] ?? '').trim()
      const source = (sourceMatch?.[1] ?? sourceMatch?.[2] ?? sourceMatch?.[3] ?? '').trim()
      const invalid = genericAlt.has(alt)
      images.push({
        alt,
        destination: tag,
        hasIntrinsicDimensions: /\bwidth\s*=\s*["']?\d+/i.test(tag) && /\bheight\s*=\s*["']?\d+/i.test(tag),
        source,
        heading: currentHeading,
        line: index + 1,
        contextualCandidate: false,
        invalidAlt: invalid,
        syntax: 'html',
      })
      if (invalid) invalidAltCount += 1
    }

    return line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, destination) => {
      const trimmedAlt = alt.trim()
      const contextualAlt = `${currentHeading}配图`
      images.push({
        alt: trimmedAlt,
        destination,
        hasIntrinsicDimensions: false,
        source: normalizeImageSource(destination),
        heading: currentHeading,
        line: index + 1,
        contextualCandidate: trimmedAlt === contextualAlt,
        syntax: 'markdown',
      })

      if (!genericAlt.has(trimmedAlt)) return match
      replacements += 1
      return `![${contextualAlt}](${destination})`
    })
  })

  return { content: output.join('\n'), replacements, invalidAltCount, images }
}

const posts = readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}(?:-[a-z0-9-]+)?$/.test(entry.name))
  .map((entry) => join(contentRoot, entry.name, 'index.md'))

const mode = process.argv[2]
if (!['--check', '--write', '--report'].includes(mode)) {
  console.error('用法：node scripts/prepare-blog-image-alt.mjs --check | --write | --report')
  process.exitCode = 1
}

let total = 0
let changedFiles = 0
let imageTotal = 0
let contextualCandidates = 0
let invalidAltTotal = 0
let coverAltCandidates = 0
let localImageTotal = 0
let externalImageTotal = 0
let unknownImageTotal = 0
let externalImageWithoutDimensionsTotal = 0
const insecureExternalImageSources = new Set()
const dependencyHosts = new Map()
const reviewItems = []
for (const file of posts) {
  if (!existsSync(file)) throw new Error(`缺少 Markdown 文件：${file}`)
  const before = readFileSync(file, 'utf8')
  const { content, replacements, invalidAltCount, images } = transform(before)
  const coverAlt = readFrontmatterValue(before, 'coverAlt')
  const title = readTitle(before)
  total += replacements
  imageTotal += images.length
  contextualCandidates += images.filter((image) => image.contextualCandidate).length
  invalidAltTotal += invalidAltCount
  for (const image of images) {
    const dependency = getImageDependency(image.source)
    if (dependency.kind === 'local') localImageTotal += 1
    else if (dependency.kind === 'unknown') unknownImageTotal += 1
    else {
      externalImageTotal += 1
      if (!image.hasIntrinsicDimensions && !dimensionsManifest.images[dependency.source]) externalImageWithoutDimensionsTotal += 1
      if (dependency.protocol !== 'https:') insecureExternalImageSources.add(image.source)
      const summary = dependencyHosts.get(dependency.host) || { count: 0, protocols: new Set(), sources: new Set() }
      summary.count += 1
      summary.protocols.add(dependency.protocol)
      summary.sources.add(dependency.source)
      dependencyHosts.set(dependency.host, summary)
    }
  }
  if (mode === '--report') {
    for (const image of images) {
      if (!image.contextualCandidate && !image.invalidAlt) continue
      reviewItems.push({
        ...image,
        file: relative(repoRoot, file).replaceAll('\\', '/'),
      })
    }
    if (!coverAlt || coverAlt === `${title}的文章封面` || /(?:文章封面|article cover)$/i.test(coverAlt)) {
      coverAltCandidates += 1
      reviewItems.push({
        alt: coverAlt,
        destination: 'frontmatter coverAlt',
        heading: title,
        line: 1,
        contextualCandidate: false,
        invalidAlt: false,
        syntax: 'cover',
        file: relative(repoRoot, file).replaceAll('\\', '/'),
      })
    }
  }
  if (mode === '--write' && content !== before) {
    writeFileSync(file, content, 'utf8')
    changedFiles += 1
  }
}

const unapprovedExternalImageHosts = [...dependencyHosts.keys()]
  .filter((host) => !approvedExternalImageHosts.has(host.toLowerCase()))
  .sort()
if (mode === '--check' && unapprovedExternalImageHosts.length > 0) {
  throw new Error(`Blog 正文图片使用了未批准的外部主机：${unapprovedExternalImageHosts.join(', ')}。请先更新 ${mediaPolicyPath} 的策略，再提交内容。`)
}
if (mode === '--check' && insecureExternalImageSources.size > 0) {
  throw new Error(`Blog 正文图片必须使用 HTTPS：${[...insecureExternalImageSources].join(', ')}`)
}
if (mode === '--check' && externalImageWithoutDimensionsTotal > mediaPolicy.maxExternalImagesWithoutDimensions) {
  throw new Error(`Blog 正文远程图片无固有尺寸数量 ${externalImageWithoutDimensionsTotal} 超过 media policy 上限 ${mediaPolicy.maxExternalImagesWithoutDimensions}；请补齐尺寸、镜像资源，或在评审后显式调整 ${mediaPolicyPath}。`)
}

if (mode === '--check' && (total > 0 || invalidAltTotal > 0)) {
  const details = [
    total > 0 ? `${total} 个 Markdown 图片通用 alt` : '',
    invalidAltTotal > 0 ? `${invalidAltTotal} 个 HTML 图片缺失或使用通用 alt` : '',
  ].filter(Boolean).join('，')
  throw new Error(`正文图片仍有 ${details}；请先运行 npm run blog:images:prepare，并手动修复 HTML 图片标签。`)
}

if (mode === '--report') {
  console.log(`Blog 图片 alt 审查报告：${posts.length} 篇文章，${imageTotal} 张正文图片，${contextualCandidates} 张章节上下文初稿，${coverAltCandidates} 个封面 coverAlt 占位，${invalidAltTotal} 个 HTML 图片 alt 问题。`)
  console.log(`图片依赖摘要：${externalImageTotal} 张外部图片，${localImageTotal} 张本地图片，${unknownImageTotal} 张未识别来源。`)
  console.log(`外部图片主机策略：已批准 ${approvedExternalImageHosts.size} 个，当前未批准 ${unapprovedExternalImageHosts.length} 个。`)
  console.log(`External images without intrinsic dimensions: ${externalImageWithoutDimensionsTotal}; report does not infer remote dimensions.`)
  console.log(`External images without dimensions policy budget: ${mediaPolicy.maxExternalImagesWithoutDimensions}.`)
  if (dependencyHosts.size > 0) {
    console.log('外部图片主机（按图片数量排序）：')
    for (const [host, summary] of [...dependencyHosts.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))) {
      const protocols = [...summary.protocols].sort().join(', ')
      console.log(`- ${host}: ${summary.count} 张，${summary.sources.size} 个唯一 URL，协议 ${protocols}`)
    }
  }
  if (reviewItems.length === 0) {
    console.log('没有检测到章节上下文初稿；仍建议对新增正文图片做人工语义复核。')
  } else {
    if (reviewItems.some((image) => image.contextualCandidate)) {
      console.log('以下图片使用“章节标题 + 配图”上下文 alt，发布前请逐张确认是否需要改成具体视觉描述：')
    }
    if (reviewItems.some((image) => image.invalidAlt)) {
      console.log('以下 HTML 图片缺少具体 alt，发布前请手动补充可感知的视觉描述：')
    }
    if (reviewItems.some((image) => image.syntax === 'cover')) {
      console.log('以下封面 coverAlt 仍使用文章标题占位，发布前建议改成与画面相关的具体视觉描述：')
    }
    for (const image of reviewItems) {
      console.log(`- ${image.file}:${image.line} | ${image.syntax} | alt="${image.alt}" | heading="${image.heading}" | ${image.destination}`)
    }
  }
  process.exit(0)
}

console.log(mode === '--write'
  ? `Blog 图片 alt 已更新：${changedFiles} 个文件，替换 ${total} 个通用 alt。`
  : `Blog 图片 alt 检查通过：${posts.length} 篇文章，无通用 alt。`)
