export interface FontChoice {
  id: string
  label: string
  family: string
  roles: readonly ('heading' | 'body')[]
  weights: readonly number[]
  packageName?: string
  version?: string
  cssEntries?: string[]
  license: { label: string; url?: string }
  source: string
}

// Families, weights and entries match the inspected package CSS, rather than package README examples.
export const fontChoices: FontChoice[] = [
  {
    id: 'system',
    label: '系统字体（基准）',
    family: '系统字体',
    roles: ['heading', 'body'],
    weights: [400, 500, 600, 700],
    license: { label: '系统字体' },
    source: '沿用网站的中西文系统字体栈；实际字形取决于设备已安装的字体，无字体文件下载。',
  },
  {
    id: 'noto-serif',
    label: 'Noto Serif SC',
    family: 'Noto Serif SC Variable',
    roles: ['heading', 'body'],
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    packageName: '@fontsource-variable/noto-serif-sc',
    version: '5.3.0',
    cssEntries: ['@fontsource-variable/noto-serif-sc/index.css'],
    license: { label: 'SIL Open Font License 1.1', url: 'https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE' },
    source: 'https://github.com/notofonts/noto-cjk',
  },
  {
    id: 'noto-sans',
    label: 'Noto Sans SC',
    family: 'Noto Sans SC Variable',
    roles: ['heading', 'body'],
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    packageName: '@fontsource-variable/noto-sans-sc',
    version: '5.3.0',
    cssEntries: ['@fontsource-variable/noto-sans-sc/index.css'],
    license: { label: 'SIL Open Font License 1.1', url: 'https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE' },
    source: 'https://github.com/notofonts/noto-cjk',
  },
  {
    id: 'zhuque',
    label: '朱雀仿宋',
    family: 'Zhuque Fangsong (technical preview)',
    roles: ['heading', 'body'],
    weights: [400],
    packageName: '@chinese-fonts/zqfs',
    version: '3.0.0',
    cssEntries: ['@chinese-fonts/zqfs/dist/ZhuqueFangsong-Regular/result.css'],
    license: { label: 'SIL Open Font License 1.1', url: 'https://github.com/TrionesType/zhuque/blob/main/LICENSE.txt' },
    source: 'https://github.com/TrionesType/zhuque',
  },
  {
    id: 'wenkai',
    label: '霞鹜文楷',
    family: 'LXGW WenKai',
    roles: ['heading', 'body'],
    weights: [400],
    packageName: '@chinese-fonts/lxgwwenkai',
    version: '3.0.0',
    cssEntries: ['@chinese-fonts/lxgwwenkai/dist/LXGWWenKai-Regular/result.css'],
    license: { label: 'SIL Open Font License 1.1', url: 'https://github.com/lxgw/LxgwWenKai/blob/main/OFL.txt' },
    source: 'https://github.com/lxgw/LxgwWenKai',
  },
  {
    id: 'smiley',
    label: '得意黑',
    family: 'Smiley Sans Oblique',
    roles: ['heading'],
    weights: [400],
    packageName: '@chinese-fonts/dyh',
    version: '3.0.0',
    cssEntries: ['@chinese-fonts/dyh/dist/SmileySans-Oblique/result.css'],
    license: { label: 'SIL Open Font License 1.1', url: 'https://github.com/atelier-anchor/smiley-sans/blob/main/LICENSE' },
    source: 'https://github.com/atelier-anchor/smiley-sans',
  },
  {
    id: 'geist',
    label: 'Geist',
    family: 'Geist Variable',
    roles: ['heading', 'body'],
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    packageName: '@fontsource-variable/geist',
    version: '5.3.0',
    cssEntries: ['@fontsource-variable/geist/index.css', '@fontsource-variable/geist/wght-italic.css'],
    license: { label: 'SIL Open Font License 1.1', url: 'https://github.com/vercel/geist-font/blob/main/OFL.txt' },
    source: 'https://github.com/vercel/geist-font',
  },
  {
    id: 'inter',
    label: 'Inter',
    family: 'Inter Variable',
    roles: ['heading', 'body'],
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    packageName: '@fontsource-variable/inter',
    version: '5.3.0',
    cssEntries: ['@fontsource-variable/inter/standard.css', '@fontsource-variable/inter/standard-italic.css'],
    license: { label: 'SIL Open Font License 1.1', url: 'https://github.com/rsms/inter/blob/master/LICENSE.txt' },
    source: 'https://github.com/rsms/inter',
  },
  {
    id: 'source-serif',
    label: 'Source Serif 4',
    family: 'Source Serif 4 Variable',
    roles: ['heading', 'body'],
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    packageName: '@fontsource-variable/source-serif-4',
    version: '5.3.0',
    cssEntries: ['@fontsource-variable/source-serif-4/standard.css', '@fontsource-variable/source-serif-4/standard-italic.css'],
    license: { label: 'SIL Open Font License 1.1', url: 'https://github.com/adobe-fonts/source-serif/blob/release/LICENSE.md' },
    source: 'https://github.com/adobe-fonts/source-serif',
  },
  {
    id: 'geist-mono',
    label: 'Geist Mono',
    family: 'Geist Mono Variable',
    roles: ['heading', 'body'],
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    packageName: '@fontsource-variable/geist-mono',
    version: '5.3.0',
    cssEntries: ['@fontsource-variable/geist-mono/index.css', '@fontsource-variable/geist-mono/wght-italic.css'],
    license: { label: 'SIL Open Font License 1.1', url: 'https://github.com/vercel/geist-font/blob/main/OFL.txt' },
    source: 'https://github.com/vercel/geist-font',
  },
]
