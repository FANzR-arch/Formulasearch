import type { AstroIntegration } from 'astro'

export default function contentStudio(): AstroIntegration {
  return {
    name: 'formula-content-studio',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({ pattern: '/content-studio', entrypoint: './src/content-studio/pages/index.astro', prerender: false })
        injectRoute({ pattern: '/content-studio/editor', entrypoint: './src/content-studio/pages/editor.astro', prerender: false })
        injectRoute({ pattern: '/content-studio/photos', entrypoint: './src/content-studio/pages/photos.astro', prerender: false })
        injectRoute({ pattern: '/content-studio/publish', entrypoint: './src/content-studio/pages/publish.astro', prerender: false })
        injectRoute({ pattern: '/api/content-studio/[action]', entrypoint: './src/content-studio/api.ts', prerender: false })
      },
    },
  }
}
