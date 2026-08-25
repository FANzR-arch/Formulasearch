import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const projectRoot = path.resolve(import.meta.dirname, '..', '..')
const manifestPath = path.resolve(process.env.PHOTO_STUDIO_MANIFEST || path.join(projectRoot, 'content', 'site', 'photo-archive.json'))
const outputRoot = path.resolve(process.env.PHOTO_STUDIO_OUTPUT || path.join(projectRoot, 'public', 'uploads', 'photos', 'select'))
const supportedImage = /\.(?:avif|jpe?g|png|webp)$/i
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex')

export const readPhotoArchive = async () => JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const writePhotoArchive = async (archive) => fs.writeFile(manifestPath, `${JSON.stringify(archive, null, 2)}\n`, 'utf8')

const collect = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const source = path.join(directory, entry.name)
    if (entry.isDirectory()) return collect(source)
    return supportedImage.test(entry.name) ? [source] : []
  }))
  return nested.flat().sort((a, b) => a.localeCompare(b, 'en'))
}

const nextNumber = (items) => Math.max(0, ...items.map((item) => Number(item.image?.match(/photo-(\d+)\.webp$/)?.[1] || 0))) + 1
const displayLayout = (index, width, height) => {
  if (index === 0) return 'hero'
  const ratio = width / height
  if (ratio < 0.92) return 'portrait'
  if (ratio < 1.08) return 'square'
  return index % 5 === 0 ? 'wide' : 'landscape'
}

export const importPhotoFiles = async (sources) => {
  const archive = await readPhotoArchive()
  const existingHashes = new Set(archive.items.map((item) => item.assetHash))
  await fs.mkdir(outputRoot, { recursive: true })
  let number = nextNumber(archive.items)
  let imported = 0
  let duplicates = 0
  for (const source of sources) {
    const pipeline = sharp(source).rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
    const main = await pipeline.clone().webp({ quality: 84, effort: 5, smartSubsample: true }).toBuffer()
    const assetHash = hash(main)
    if (existingHashes.has(assetHash)) { duplicates += 1; continue }
    const preview = await pipeline.clone().resize({ width: 960, withoutEnlargement: true }).webp({ quality: 80, effort: 5, smartSubsample: true }).toBuffer()
    const mainMeta = await sharp(main).metadata()
    const previewMeta = await sharp(preview).metadata()
    if (!mainMeta.width || !mainMeta.height || !previewMeta.width) throw new Error(`无法读取图片尺寸：${source}`)
    const padded = String(number).padStart(3, '0')
    const image = `/uploads/photos/select/photo-${padded}.webp`
    const previewImage = `/uploads/photos/select/photo-${padded}-960.webp`
    await fs.writeFile(path.join(outputRoot, `photo-${padded}.webp`), main)
    await fs.writeFile(path.join(outputRoot, `photo-${padded}-960.webp`), preview)
    const order = archive.items.length
    archive.items.push({
      alt: { zh: `待补充摄影描述 ${padded}`, en: `Photography record ${padded} awaiting description` },
      height: mainMeta.height,
      image,
      index: String(order + 1).padStart(2, '0'),
      layout: displayLayout(order, mainMeta.width, mainMeta.height),
      tags: ['selected'],
      width: mainMeta.width,
      assetHash,
      previewImage,
      previewWidth: previewMeta.width,
    })
    existingHashes.add(assetHash)
    number += 1
    imported += 1
  }
  await writePhotoArchive(archive)
  return { imported, duplicates, total: archive.items.length }
}

export const importPhotoFolder = async (directory) => {
  const absolute = path.resolve(directory)
  const stat = await fs.stat(absolute)
  if (!stat.isDirectory()) throw new Error('选择的路径不是文件夹。')
  const files = await collect(absolute)
  if (!files.length) throw new Error('文件夹中没有可导入的图片。')
  return importPhotoFiles(files)
}

const resolveOutput = (source) => {
  if (!source.startsWith('/uploads/photos/select/')) throw new Error(`拒绝删除未知路径：${source}`)
  const target = path.resolve(outputRoot, path.basename(source))
  if (!target.startsWith(`${outputRoot}${path.sep}`)) throw new Error(`图片路径越界：${source}`)
  return target
}

export const deletePhoto = async (assetHash) => {
  const archive = await readPhotoArchive()
  const index = archive.items.findIndex((item) => item.assetHash === assetHash)
  if (index < 0) throw new Error('找不到要删除的照片。')
  const [item] = archive.items.splice(index, 1)
  await Promise.all([item.image, item.previewImage].filter(Boolean).map((source) => fs.rm(resolveOutput(source), { force: true })))
  archive.items.forEach((entry, order) => { entry.index = String(order + 1).padStart(2, '0') })
  await writePhotoArchive(archive)
  return { deleted: item.image, total: archive.items.length }
}

export const updatePhotoItems = async (updates) => {
  const archive = await readPhotoArchive()
  const existing = new Map(archive.items.map((item) => [item.assetHash, item]))
  if (!Array.isArray(updates) || updates.length !== archive.items.length) throw new Error('照片更新数量与当前清单不一致。')
  const seen = new Set()
  archive.items = updates.map((update, order) => {
    const original = existing.get(update.assetHash)
    if (!original || seen.has(update.assetHash)) throw new Error('照片排序包含未知或重复记录。')
    seen.add(update.assetHash)
    const zh = String(update.alt?.zh || '').trim()
    const en = String(update.alt?.en || '').trim()
    if (!zh || !en) throw new Error('中英文图片描述不能为空。')
    const tags = [...new Set((update.tags || []).map((tag) => String(tag).trim()).filter(Boolean))]
    if (!tags.length) throw new Error('每张照片至少需要一个标签。')
    return { ...original, alt: { zh, en }, tags, index: String(order + 1).padStart(2, '0') }
  })
  await writePhotoArchive(archive)
  return { updated: archive.items.length }
}
