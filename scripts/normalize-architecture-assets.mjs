import fs from 'node:fs/promises'
import path from 'node:path'

const oldDirectory = path.resolve('src/assets/archive/architecture/qingdao-mountain-sea')
const newDirectory = path.resolve('src/assets/archive/architecture/qingdao-hill-ocean')
const projectPath = path.resolve('content/architecture/qingdao-hill-ocean/index.json')

const oldExists = await fs.access(oldDirectory).then(() => true, () => false)
const newExists = await fs.access(newDirectory).then(() => true, () => false)
if (oldExists && newExists) throw new Error('新旧 Qingdao Architecture 资源目录同时存在，拒绝自动合并。')
if (oldExists) await fs.rename(oldDirectory, newDirectory)

const source = await fs.readFile(projectPath, 'utf8')
const normalized = source.replaceAll('/qingdao-mountain-sea/', '/qingdao-hill-ocean/')
if (normalized !== source) await fs.writeFile(projectPath, normalized, 'utf8')
console.log('Architecture 资源目录已与项目 slug 对齐。')
