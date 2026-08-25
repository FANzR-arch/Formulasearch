import fs from 'node:fs/promises'
import path from 'node:path'

const sourcePath = path.resolve('content/site/architecture.json')
const projectsRoot = path.resolve('content/architecture')
const assetPaths = {
  'nanjing-entrance-render': '/src/assets/archive/architecture/nanjing-stone-city/entrance-render.png',
  'nanjing-exploded-axon': '/src/assets/archive/architecture/nanjing-stone-city/exploded-axon.png',
  'qingdao-hero': '/src/assets/archive/architecture/qingdao-mountain-sea/hero.png',
  'qingdao-board-01': '/src/assets/archive/architecture/qingdao-mountain-sea/board-01.webp',
  'qingdao-board-02': '/src/assets/archive/architecture/qingdao-mountain-sea/board-02.webp',
  'qingdao-board-03': '/src/assets/archive/architecture/qingdao-mountain-sea/board-03.webp',
  'qingdao-board-04': '/src/assets/archive/architecture/qingdao-mountain-sea/board-04.webp',
  'qingdao-board-05': '/src/assets/archive/architecture/qingdao-mountain-sea/board-05.webp',
  'qingdao-board-06': '/src/assets/archive/architecture/qingdao-mountain-sea/board-06.webp',
  'qingdao-board-07': '/src/assets/archive/architecture/qingdao-mountain-sea/board-07.webp',
}

const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'))
if (!Array.isArray(source.projects) || !Array.isArray(source.items)) {
  console.log('Architecture 已经使用项目集合，无需再次迁移。')
  process.exit(0)
}

const itemsById = new Map(source.items.map((item) => [item.image, item]))
for (const project of source.projects) {
  const images = project.imageIds.map((id) => {
    const item = itemsById.get(id)
    if (!item || !assetPaths[id]) throw new Error(`Architecture 图片映射缺失：${id}`)
    return { ...item, image: assetPaths[id] }
  })
  const record = {
    slug: project.slug,
    index: project.index,
    title: project.title,
    summary: project.summary,
    cover: assetPaths[project.cover],
    images,
  }
  const targetDirectory = path.join(projectsRoot, project.slug)
  await fs.mkdir(targetDirectory, { recursive: true })
  await fs.writeFile(path.join(targetDirectory, 'index.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
}

delete source.projects
delete source.items
await fs.writeFile(sourcePath, `${JSON.stringify(source, null, 2)}\n`, 'utf8')
console.log(`Architecture 项目集合迁移完成：${source.filters.length - 1} 个项目，${itemsById.size} 张图片。`)
