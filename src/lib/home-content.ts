import rawEn from '../../content/site/home.en.md?raw'
import rawZh from '../../content/site/home.md?raw'

type WorkItem = { title: string; description: string }

export type HomeContent = {
  about: string[]
  email: string
  eyebrow: string
  heroImage: string
  identity: string[]
  intro: string[]
  interest: string[]
  name: string
  now: { number: string; text: string }[]
  resources: string
  socialLabel: string
  socialUrl: string
  sponsor: string
  statement: string
  work: WorkItem[]
  writing: string
}

function frontmatterValue(raw: string, key: string) {
  const match = raw.match(new RegExp(`^${key}:\\s*["']?([^\\n"']*)["']?\\s*$`, 'm'))
  return match?.[1]?.trim() ?? ''
}

function section(raw: string, title: string) {
  const heading = `\n## ${title}\n`
  const headingStart = raw.indexOf(heading)
  if (headingStart === -1) return ''
  const contentStart = headingStart + heading.length
  const nextHeading = raw.indexOf('\n## ', contentStart)
  return raw.slice(contentStart, nextHeading === -1 ? raw.length : nextHeading).trim()
}

function paragraphs(value: string) {
  return value.split('\n').map((line) => line.replace(/\r$/, '').trim()).filter((line) => line && !line.startsWith('<!--'))
}

function paragraphBlocks(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((line) => line.replace(/\r$/, '').trim()).filter(Boolean).join(' '))
    .filter((block) => block && !block.startsWith('<!--'))
}

function list(value: string) {
  return value.split('\n').map((line) => line.replace(/\r$/, '').replace(/^-\s*/, '').trim()).filter(Boolean)
}

function workItems(value: string): WorkItem[] {
  return value.split(/^### /m).slice(1).map((block) => {
    const [title, ...description] = block.split('\n')
    return { title: title.trim(), description: paragraphs(description.join('\n')).join(' ') }
  })
}

function parseHomeContent(raw: string): HomeContent {
  const intro = paragraphs(section(raw, 'Intro'))
  const about = paragraphBlocks(section(raw, 'About'))
  const interest = paragraphBlocks(section(raw, 'Interest'))
  const identity = list(section(raw, 'Identity'))
  const now = list(section(raw, 'Now')).slice(1).map((text, index) => ({ number: String(index + 1).padStart(2, '0'), text }))

  return {
    name: frontmatterValue(raw, 'name') || 'Phil',
    eyebrow: frontmatterValue(raw, 'eyebrow'),
    email: frontmatterValue(raw, 'email'),
    socialLabel: frontmatterValue(raw, 'xLabel') || '@Formulasearch',
    socialUrl: frontmatterValue(raw, 'xUrl') || 'https://x.com/Formulasearch',
    heroImage: frontmatterValue(raw, 'heroImage'),
    intro,
    about,
    interest,
    sponsor: paragraphBlocks(section(raw, 'Sponsor')).join(' '),
    statement: paragraphs(section(raw, 'Statement')).join(' '),
    identity,
    work: workItems(section(raw, 'Work')),
    writing: paragraphs(section(raw, 'Writing')).join(' '),
    resources: paragraphs(section(raw, 'Resources')).join(' '),
    now,
  }
}

export const homeContent = {
  en: parseHomeContent(rawEn),
  zh: parseHomeContent(rawZh),
}
