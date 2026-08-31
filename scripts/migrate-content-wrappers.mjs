import fs from 'node:fs/promises'
import path from 'node:path'

const targets = [
  'content/blog/categories.json',
  'content/site/blog-series.json',
  'content/site/navigation.json',
]

for (const target of targets) {
  const absolute = path.resolve(target)
  const data = JSON.parse(await fs.readFile(absolute, 'utf8'))
  if (!Array.isArray(data)) continue
  await fs.writeFile(absolute, `${JSON.stringify({ items: data }, null, 2)}\n`, 'utf8')
  console.log(`Wrapped ${target} in an items object.`)
}
