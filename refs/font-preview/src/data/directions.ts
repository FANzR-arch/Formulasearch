export interface Direction {
  id: string
  label: string
  description: string
  fonts: { latinSans: string; latinSerif?: string; cjkHeading: string; cjkBody: string; mono: string }
  scale: { pageTitle: string; h2: string; h3: string; lead: string; body: string; small: string; label: string }
  weights: { heading: number; body: number; label: number }
  tracking: { latinHeading: string; cjkHeading: string; label: string }
  leading: { heading: number; body: number }
  labelStyle: 'site-default' | 'mono-uppercase' | 'muted-plain'
}

const techScale = {
  pageTitle: 'clamp(2.75rem, 4.5vw, 4.5rem)',
  h2: 'clamp(2rem, 3.2vw, 3.2rem)',
  h3: 'clamp(1.5rem, 2.2vw, 2.2rem)',
  lead: 'clamp(1.125rem, 1.5vw, 1.375rem)',
  body: '1rem', small: '.875rem', label: '.75rem',
}
const editorialScale = {
  pageTitle: 'clamp(3rem, 5.5vw, 5.5rem)',
  h2: 'clamp(2rem, 3.5vw, 3.5rem)',
  h3: 'clamp(1.5rem, 2.25vw, 2.25rem)',
  lead: 'clamp(1.1875rem, 1.75vw, 1.5rem)',
  body: '1.0625rem', small: '.875rem', label: '.8125rem',
}
export const directions: Direction[] = [
  {
    id: 'current', label: '当前站点（基准）',
    description: '修正层级后的主站系统字体栈，保留现有西文衬线与中文系统字体。',
    fonts: { latinSans: 'system', latinSerif: 'system', cjkHeading: 'system', cjkBody: 'system', mono: 'system' },
    scale: { pageTitle: 'clamp(2.75rem, 3.5vw, 3.5rem)', h2: 'clamp(2rem, 2.5vw, 2.5rem)', h3: 'clamp(1.5rem, 1.875vw, 1.875rem)', lead: 'clamp(1.125rem, 1.4vw, 1.4rem)', body: 'clamp(1.0625rem, 1.2vw, 1.1875rem)', small: '.875rem', label: '.75rem' },
    weights: { heading: 600, body: 400, label: 600 },
    tracking: { latinHeading: '-.04em', cjkHeading: '0', label: '.08em' },
    leading: { heading: 1.25, body: 1.82 }, labelStyle: 'site-default',
  },
  {
    id: 'tech', label: '科技精致 · Geist', description: '参考 Vercel / Linear 的简洁无衬线排印，适合产品、工具与技术文章。',
    fonts: { latinSans: 'geist', cjkHeading: 'noto-sans', cjkBody: 'system', mono: 'geist-mono' },
    scale: techScale, weights: { heading: 600, body: 400, label: 500 },
    tracking: { latinHeading: '-.03em', cjkHeading: '0', label: '.06em' },
    leading: { heading: 1.25, body: 1.7 }, labelStyle: 'mono-uppercase',
  },
  {
    id: 'tech-inter', label: '科技精致 · Inter', description: '与 Geist 同一阶梯；用 Inter 的 optical sizing 比较西文标题与界面的气质。',
    fonts: { latinSans: 'inter', cjkHeading: 'noto-sans', cjkBody: 'system', mono: 'geist-mono' },
    scale: techScale, weights: { heading: 600, body: 400, label: 500 },
    tracking: { latinHeading: '-.03em', cjkHeading: '0', label: '.06em' },
    leading: { heading: 1.25, body: 1.7 }, labelStyle: 'mono-uppercase',
  },
  {
    id: 'editorial', label: '编辑杂志 · 宋体', description: '参考 Pentagram / Kinfolk 的编辑层级，衬线标题与安静的无衬线正文，适合长文和作品叙述。',
    fonts: { latinSans: 'system', latinSerif: 'source-serif', cjkHeading: 'noto-serif', cjkBody: 'system', mono: 'system' },
    scale: editorialScale, weights: { heading: 600, body: 400, label: 400 },
    tracking: { latinHeading: '-.025em', cjkHeading: '0', label: '0' },
    leading: { heading: 1.25, body: 1.8 }, labelStyle: 'muted-plain',
  },
  {
    id: 'editorial-fangsong', label: '编辑杂志 · 仿宋', description: '保留杂志阶梯，用朱雀仿宋的文气与宋体对照。中文标题为真实 Regular 400，不合成粗体。',
    fonts: { latinSans: 'system', latinSerif: 'source-serif', cjkHeading: 'zhuque', cjkBody: 'system', mono: 'system' },
    scale: editorialScale, weights: { heading: 400, body: 400, label: 400 },
    tracking: { latinHeading: '-.025em', cjkHeading: '0', label: '0' },
    leading: { heading: 1.25, body: 1.8 }, labelStyle: 'muted-plain',
  },
]
