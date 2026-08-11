import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import siteConfig from './content/site/site.json' with { type: 'json' }

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
      node.data ??= {}
      node.data.hProperties = {
        ...node.data.hProperties,
        loading: 'lazy',
        decoding: 'async',
        referrerpolicy: 'no-referrer',
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
    processor: unified({ remarkPlugins: [addArticleImageAttributes] }),
  },
})
