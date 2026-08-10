import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'

const addArticleImageAttributes = () => (tree) => {
  const visit = (node) => {
    if (node.type === 'image') {
      node.alt = node.alt && node.alt !== '图像' ? node.alt : 'Article image'
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
  site: 'https://formulasearch.com',
  output: 'static',
  trailingSlash: 'never',
  markdown: {
    processor: unified({ remarkPlugins: [addArticleImageAttributes] }),
  },
})
