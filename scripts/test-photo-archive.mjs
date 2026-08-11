import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const projectRoot = process.cwd()
const sourceAssets = path.resolve(projectRoot, 'public/uploads/photos/select')
const generator = path.resolve(projectRoot, 'scripts/prepare-photo-archive.mjs')
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'formulasearch-photo-'))

function runGenerator(environment) {
  const result = spawnSync(process.execPath, [generator], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  })
  if (result.status !== 0) {
    throw new Error(`Photo archive generator failed.\n${result.stdout}\n${result.stderr}`)
  }
}

try {
  const sourceA = path.join(temporaryRoot, 'source-a')
  const sourceB = path.join(temporaryRoot, 'source-b')
  const output = path.join(temporaryRoot, 'output')
  const manifest = path.join(temporaryRoot, 'manifest.json')
  await fs.mkdir(sourceA, { recursive: true })
  await fs.mkdir(sourceB, { recursive: true })

  const publishedAssets = (await fs.readdir(sourceAssets))
    .filter((entry) => entry.endsWith('.webp'))
    .sort((left, right) => left.localeCompare(right, 'en'))
    .slice(0, 2)
  if (publishedAssets.length < 2) throw new Error('Photo archive regression test needs at least two published WebP assets.')

  for (const [index, asset] of publishedAssets.entries()) {
    const source = path.join(sourceAssets, asset)
    await sharp(source).jpeg({ quality: 88 }).toFile(path.join(sourceA, `${String(index + 1).padStart(3, '0')}.jpg`))
    await sharp(source).jpeg({ quality: 88 }).toFile(path.join(sourceB, `${String(2 - index).padStart(3, '0')}.jpg`))
  }

  const environment = {
    PHOTO_ARCHIVE_MANIFEST: manifest,
    PHOTO_ARCHIVE_OUTPUT: output,
    PHOTO_ARCHIVE_SOURCE: sourceA,
  }
  runGenerator(environment)

  const firstManifest = JSON.parse(await fs.readFile(manifest, 'utf8'))
  firstManifest.items[0].alt = { zh: 'MARK-RAW-1', en: 'MARK-RAW-1' }
  firstManifest.items[1].alt = { zh: 'MARK-RAW-2', en: 'MARK-RAW-2' }
  await fs.writeFile(manifest, `\uFEFF${JSON.stringify(firstManifest, null, 2)}\n`, 'utf8')

  runGenerator({ ...environment, PHOTO_ARCHIVE_SOURCE: sourceB })
  const reorderedManifest = JSON.parse((await fs.readFile(manifest, 'utf8')).replace(/^\uFEFF/, ''))
  const actual = reorderedManifest.items.map((item) => item.alt.zh)
  const expected = ['MARK-RAW-2', 'MARK-RAW-1']
  if (actual.join('|') !== expected.join('|')) {
    throw new Error(`Photo archive metadata did not follow image content after reorder: ${actual.join(', ')}`)
  }

  console.log('Photo archive asset hash regression test passed (reorder + UTF-8 BOM manifest).')
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true })
}
