import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import keystatic from '@keystatic/astro'
import tailwindcss from '@tailwindcss/vite'
import contentStudio from './src/content-studio/integration.ts'
import { unified } from '@astrojs/markdown-remark'
import siteConfig from './content/site/site.json' with { type: 'json' }
import blogImageDimensions from './content/site/blog-image-dimensions.json' with { type: 'json' }
import blogMedia from './content/site/blog-media.json' with { type: 'json' }
import typography from './scripts/typography-integration.mjs'

const normalizeImageUrl = (value) => {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString()
  } catch {
    return value.replaceAll('&amp;', '&').replaceAll('&#x26;', '&')
  }
}

const articleImageDimensions = new Map(Object.entries(blogImageDimensions.images).map(([source, dimensions]) => [normalizeImageUrl(source), dimensions]))
const articleImageDimensionsByPath = new Map(Object.entries(blogImageDimensions.images).map(([source, dimensions]) => {
  try { return [new URL(source).pathname, dimensions] } catch { return [source, dimensions] }
}))

const addArticleImageAttributes = () => (tree, file) => {
  const articleTitle = file?.data?.astro?.frontmatter?.title || ''
  let currentHeading = ''
  const textContent = (node) => node.children?.map((child) => child.value || textContent(child)).join('') || ''
  const visit = (node) => {
    if (node.type === 'heading') currentHeading = textContent(node).trim()
    if (node.type === 'image') {
      const headingAlt = currentHeading
        ? /[\u4e00-\u9fff]/.test(currentHeading)
          ? `${currentHeading}配图`
          : `${currentHeading} illustration`
        : ''
      node.alt = node.alt && node.alt !== '图像'
        ? node.alt
        : headingAlt
          ? headingAlt
          : articleTitle
            ? /[\u4e00-\u9fff]/.test(articleTitle)
              ? `${articleTitle}配图`
              : `${articleTitle} illustration`
            : 'Article illustration'
    }
    node.children?.forEach(visit)
  }

  visit(tree)
}

const addRenderedImageAttributes = () => (tree) => {
  const visit = (node) => {
    if (node.type === 'element' && node.tagName === 'img') {
      const source = typeof node.properties?.src === 'string' ? node.properties.src : ''
      const normalizedUrl = normalizeImageUrl(source)
      const dimensions = articleImageDimensions.get(normalizedUrl) ?? (() => {
        try { return articleImageDimensionsByPath.get(new URL(source).pathname) } catch { return undefined }
      })()
      node.properties = {
        ...node.properties,
        loading: node.properties?.loading ?? 'lazy',
        decoding: node.properties?.decoding ?? 'async',
        referrerpolicy: node.properties?.referrerpolicy ?? 'no-referrer',
        ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
      }
    }
    node.children?.forEach(visit)
  }

  visit(tree)
}

// Local article images are served as AVIF / WebP at the column's widths (scripts/prepare-blog-media.mjs);
// the original file stays as the fallback <img>, so failed-media handling and alt text are unchanged.
const articleImageSizes = '(max-width: 820px) calc(100vw - 32px), 720px'
const serveOptimizedArticleImages = () => (tree) => {
  const visit = (node) => {
    node.children?.forEach((child, index) => {
      if (child.type === 'element' && child.tagName === 'img' && node.tagName !== 'picture') {
        const media = blogMedia[typeof child.properties?.src === 'string' ? child.properties.src : '']
        if (media) {
          const srcset = (variants) => variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ')
          node.children[index] = {
            type: 'element',
            tagName: 'picture',
            properties: {},
            children: [
              { type: 'element', tagName: 'source', properties: { type: 'image/avif', srcSet: srcset(media.avif), sizes: articleImageSizes }, children: [] },
              ...(media.optimized.length ? [{ type: 'element', tagName: 'source', properties: { type: 'image/webp', srcSet: srcset(media.optimized), sizes: articleImageSizes }, children: [] }] : []),
              { ...child, properties: { width: media.width, height: media.height, ...child.properties } },
            ],
          }
          return
        }
      }
      visit(child)
    })
  }

  visit(tree)
}

const contentStudioEnabled = process.env.CONTENT_STUDIO === '1'

export default defineConfig({
  site: siteConfig.siteUrl,
  output: 'static',
  trailingSlash: 'never',
  // The former Explore page now lives at /resources.
  redirects: { '/lab': '/resources', '/en/lab': '/en/resources' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  experimental: { clientPrerender: true },
  integrations: [typography(), ...(contentStudioEnabled ? [react(), keystatic(), contentStudio()] : [])],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: unified({
      remarkPlugins: [addArticleImageAttributes],
      rehypePlugins: [addRenderedImageAttributes, serveOptimizedArticleImages],
    }),
  },
})
