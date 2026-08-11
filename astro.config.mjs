import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import siteConfig from './content/site/site.json' with { type: 'json' }
import blogImageDimensions from './content/site/blog-image-dimensions.json' with { type: 'json' }

const normalizeImageUrl = (value) => {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString()
  } catch {
    return value.replaceAll('&amp;', '&').replaceAll('&#x26;', '&')
  }
}

const remoteImageDimensions = new Map(Object.entries(blogImageDimensions.images).map(([source, dimensions]) => [normalizeImageUrl(source), dimensions]))
const remoteImageDimensionsByPath = new Map(Object.entries(blogImageDimensions.images).map(([source, dimensions]) => {
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
      const dimensions = remoteImageDimensions.get(normalizedUrl) ?? (() => {
        try { return remoteImageDimensionsByPath.get(new URL(source).pathname) } catch { return undefined }
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

export default defineConfig({
  site: siteConfig.siteUrl,
  output: 'static',
  trailingSlash: 'never',
  markdown: {
    processor: unified({
      remarkPlugins: [addArticleImageAttributes],
      rehypePlugins: [addRenderedImageAttributes],
    }),
  },
})
