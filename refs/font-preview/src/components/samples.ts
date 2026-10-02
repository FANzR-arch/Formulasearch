// Real production copy shared by the page specimens and the font comparison grid.
import { parseFrontmatter, unified } from '@astrojs/markdown-remark'
import { homeContent } from '../../../../src/lib/home-content'
import { getBlogCategory } from '../../../../src/data/blog-categories'
import bauhausSource from '../../../../content/blog/2026-06-19/index.md?raw'
import minimaxSource from '../../../../content/blog/2026-08-30/index.md?raw'

const { frontmatter, content } = parseFrontmatter(bauhausSource)
const postSample = (metadata: typeof frontmatter) => {
  const category = getBlogCategory(String(metadata.category))
  return {
    title: { zh: String(metadata.title), en: String(metadata.titleEn ?? metadata.title) },
    summary: { zh: String(metadata.description), en: String(metadata.descriptionEn ?? metadata.description) },
    date: metadata.pubDate instanceof Date ? metadata.pubDate.toISOString().slice(0, 10) : String(metadata.pubDate).slice(0, 10),
    slug: String(metadata.slug),
    category: { zh: category.title, en: category.titleEn },
  }
}
export const blogRows = [postSample(frontmatter), postSample(parseFrontmatter(minimaxSource).frontmatter)]

export const heading = {
  zh: String(frontmatter.title),
  en: String(frontmatter.titleEn),
}
export const paragraph = {
  zh: homeContent.zh.about[1],
  en: homeContent.en.about[1],
}

// Stop at a complete paragraph; media and tables would distract from text comparison.
const excerptBlocks: string[] = []
let excerptCharacters = 0
for (const block of content.trim().split(/\r?\n\s*\r?\n/)) {
  const text = block.trim()
  if (!text || /^(?:!\[|\||```|<(?:video|audio)\b)/.test(text)) continue
  const characters = text.replace(/\s/g, '').length
  if (excerptBlocks.length && excerptCharacters + characters > 850) break
  excerptBlocks.push(text)
  excerptCharacters += characters
}
let sectionIndex = 0
const zhMarkdown = excerptBlocks.join('\n\n')
  // Only specimen roles change: a real subsection becomes h3, and an existing term gets code styling.
  .replace(/^## (.+)$/gm, (_, title: string) => `${++sectionIndex === 2 ? '###' : '##'} ${title}`)
  .replace('Bauhaus style', '`Bauhaus style`')

// The article already publishes this English prompt; this is not a translated or invented article body.
const promptBlocks = [...content.matchAll(/```(?:\w+)?\r?\n([\s\S]*?)\r?\n```/g)]
const englishPrompt = promptBlocks.find((match) => match[1].startsWith('TITLE: "AI Design Systems"'))?.[1]
if (!englishPrompt) throw new Error('Font preview: the published Bauhaus example prompt is missing.')
const promptLines = englishPrompt.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
const promptTitle = promptLines[0].match(/^TITLE:\s*"([^"]+)"/)?.[1]
if (!promptTitle) throw new Error('Font preview: the Bauhaus example prompt needs its original title.')
const enBlocks = [`## ${promptTitle}`, `> ${promptLines[1]}`, `### ${promptLines[2]}`]
let englishCharacters = enBlocks.join('\n\n').length
for (const line of promptLines.slice(3)) {
  if (englishCharacters + line.length > 800) break
  enBlocks.push(line)
  englishCharacters += line.length
}
const enMarkdown = enBlocks.join('\n\n').replace('Bauhaus-inspired', '`Bauhaus-inspired`')

// Use the same Astro unified Markdown pipeline as the production site. No extra parser dependency.
const renderer = await unified().createRenderer({ syntaxHighlight: false })
const [zhRendered, enRendered] = await Promise.all([
  renderer.render(zhMarkdown),
  renderer.render(enMarkdown),
])
export const articleHtml = { zh: zhRendered.code, en: enRendered.code }
// Each A/B pane keeps its own Markdown heading anchors without changing the excerpt.
export const withSampleIdPrefix = (html: string, prefix: string) => prefix
  ? html.replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${prefix}-${id}"`)
    .replace(/\bhref="#([^"]+)"/g, (_, id: string) => `href="#${prefix}-${id}"`)
  : html
export const articleMetadata = {
  title: heading,
  description: { zh: String(frontmatter.description), en: String(frontmatter.descriptionEn) },
  date: frontmatter.pubDate instanceof Date ? frontmatter.pubDate.toISOString().slice(0, 10) : String(frontmatter.pubDate).slice(0, 10),
  slug: String(frontmatter.slug),
  category: blogRows[0].category,
  excerptCharacters: { zh: excerptCharacters, en: englishCharacters },
}
export const sources = {
  home: {
    path: 'content/site/home.json + content/site/home.en.json',
    note: 'Homepage introduction and paragraphs come directly from the validated homeContent data.',
  },
  projects: {
    path: 'content/site/catalog.json → pages.projects / projects[tools]',
    note: 'The real projects hero, Independent Development group, and Seedo, RZFrame, BrianK cards are reused.',
  },
  navigation: {
    path: 'content/site/navigation.json → primaryNavigation',
    note: 'The four primary navigation labels retain the production nav classes without its menu controller.',
  },
  blogIndex: {
    path: 'content/blog/2026-06-19/index.md + content/blog/2026-08-30/index.md + content/blog/categories.json',
    note: 'Two published local posts provide original titles, summaries, dates, and bilingual category names.',
  },
  article: {
    path: 'content/blog/2026-06-19/index.md',
    note: 'Chinese paragraphs and the published English AI Design Systems prompt are excerpted without rewriting. Only h3, quote, and inline-code roles are adapted for typography comparison.',
  },
}

export const specimenTitle = heading
export const specimenParagraph = paragraph
