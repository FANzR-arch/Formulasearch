// Each entry points to an installed and inspected package CSS file.
// Vite imports these only in the independent preview application.
export const fontLoaders: Record<string, () => Promise<void>> = {
  'noto-serif': async () => { await import('@fontsource-variable/noto-serif-sc/index.css') },
  'noto-sans': async () => { await import('@fontsource-variable/noto-sans-sc/index.css') },
  zhuque: async () => { await import('@chinese-fonts/zqfs/dist/ZhuqueFangsong-Regular/result.css') },
  wenkai: async () => { await import('@chinese-fonts/lxgwwenkai/dist/LXGWWenKai-Regular/result.css') },
  smiley: async () => { await import('@chinese-fonts/dyh/dist/SmileySans-Oblique/result.css') },
  geist: async () => {
    await import('@fontsource-variable/geist/index.css')
    await import('@fontsource-variable/geist/wght-italic.css')
  },
  inter: async () => {
    await import('@fontsource-variable/inter/standard.css')
    await import('@fontsource-variable/inter/standard-italic.css')
  },
  'source-serif': async () => {
    await import('@fontsource-variable/source-serif-4/standard.css')
    await import('@fontsource-variable/source-serif-4/standard-italic.css')
  },
  'geist-mono': async () => {
    await import('@fontsource-variable/geist-mono/index.css')
    await import('@fontsource-variable/geist-mono/wght-italic.css')
  },
}
