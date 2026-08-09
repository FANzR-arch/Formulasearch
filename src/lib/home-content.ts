import raw from '../../content/site/home.md?raw'

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

function frontmatterValue(key: string) {
  const match = raw.match(new RegExp(`^${key}:\\s*["']?([^\\n"']*)["']?\\s*$`, 'm'))
  return match?.[1]?.trim() ?? ''
}

function section(title: string) {
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

const intro = paragraphs(section('Intro'))
const about = paragraphBlocks(section('About'))
const interest = paragraphBlocks(section('Interest'))
const identity = list(section('Identity'))
const now = list(section('Now')).slice(1).map((text, index) => ({ number: String(index + 1).padStart(2, '0'), text }))

export const homeContent: HomeContent = {
  name: frontmatterValue('name') || 'Phil',
  eyebrow: frontmatterValue('eyebrow'),
  email: frontmatterValue('email'),
  socialLabel: frontmatterValue('xLabel') || '@Formulasearch',
  socialUrl: frontmatterValue('xUrl') || 'https://x.com/Formulasearch',
  heroImage: frontmatterValue('heroImage'),
  intro,
  about,
  interest,
  sponsor: paragraphBlocks(section('Sponsor')).join(' '),
  statement: paragraphs(section('Statement')).join(' '),
  identity,
  work: workItems(section('Work')),
  writing: paragraphs(section('Writing')).join(' '),
  resources: paragraphs(section('Resources')).join(' '),
  now,
}
