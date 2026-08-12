import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultManifestPath = path.resolve(process.env.PHOTO_SOURCE_MANIFEST ?? 'content/site/photo-source-manifest.json')
const supportedImage = /\.(?:jpe?g|png)$/i
const modes = ['--write', '--check', '--report']
const args = process.argv.slice(2)
const selectedModes = modes.filter((mode) => args.includes(mode))
const sourceArgument = args.find((arg) => !arg.startsWith('--'))
const sourceDirectory = process.env.PHOTO_ARCHIVE_SOURCE ?? sourceArgument
const manifestPath = defaultManifestPath

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: npm run photos:source:manifest:<write|check|report> -- <source-directory>')
  console.log('Optional: PHOTO_ARCHIVE_SOURCE and PHOTO_SOURCE_MANIFEST can provide the paths.')
  process.exit(0)
}

if (selectedModes.length !== 1) {
  throw new Error('Choose exactly one mode: --write, --check, or --report.')
}

if (!sourceDirectory) {
  throw new Error('Photo source directory is required. Pass it as the first argument or set PHOTO_ARCHIVE_SOURCE.')
}

const sourceRoot = path.resolve(sourceDirectory)
const mode = selectedModes[0]

function relativePath(value) {
  return value.split(path.sep).join('/')
}

function assertSafeRelativePath(value, label) {
  if (typeof value !== 'string' || !value || path.isAbsolute(value)) {
    throw new Error(`${label} must be a relative path.`)
  }
  const normalized = path.posix.normalize(value.replaceAll('\\', '/'))
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`${label} escapes the source directory: ${value}`)
  }
  return normalized
}

function hashBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function collectImages(directory, root = directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      if (supportedImage.test(entry.name)) throw new Error(`Photo source must not contain symlinked images: ${entryPath}`)
      continue
    }
    if (entry.isDirectory()) {
      files.push(...await collectImages(entryPath, root))
      continue
    }
    if (!entry.isFile() || !supportedImage.test(entry.name)) continue

    const buffer = await fs.readFile(entryPath)
    const stat = await fs.stat(entryPath)
    files.push({
      bytes: stat.size,
      path: relativePath(path.relative(root, entryPath)),
      sha256: hashBuffer(buffer),
    })
  }

  return files.sort((left, right) => left.path.localeCompare(right.path, 'en'))
}

function manifestFor(files) {
  const source = relativePath(path.relative(projectRoot, sourceRoot)) || '.'
  return { version: 1, source, files }
}

function parseManifest(source) {
  let parsed
  try {
    parsed = JSON.parse(source.replace(/^\uFEFF/, ''))
  } catch (error) {
    throw new Error(`Unable to parse photo source manifest: ${error.message}`)
  }
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.files)) {
    throw new Error('Photo source manifest must contain version 1 and a files array.')
  }

  const seen = new Set()
  const files = parsed.files.map((file, index) => {
    const filePath = assertSafeRelativePath(file?.path, `Manifest file ${index + 1} path`)
    if (seen.has(filePath)) throw new Error(`Photo source manifest contains a duplicate path: ${filePath}`)
    seen.add(filePath)
    if (!Number.isInteger(file.bytes) || file.bytes < 0) throw new Error(`Manifest file ${filePath} has invalid byte count.`)
    if (!/^[a-f0-9]{64}$/i.test(file.sha256 ?? '')) throw new Error(`Manifest file ${filePath} has an invalid SHA-256 hash.`)
    return { bytes: file.bytes, path: filePath, sha256: file.sha256.toLowerCase() }
  })
  return { ...parsed, files }
}

function indexFiles(files) {
  return new Map(files.map((file) => [file.path, file]))
}

function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

const sourceStat = await fs.stat(sourceRoot).catch(() => null)
if (!sourceStat?.isDirectory()) throw new Error(`Photo source directory does not exist: ${sourceRoot}`)

const files = await collectImages(sourceRoot)
if (files.length === 0) throw new Error(`No supported JPG/PNG files found in ${sourceRoot}`)

if (mode === '--report') {
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  console.log(`Photo source inventory: ${files.length} files, ${formatMiB(totalBytes)}.`)
  for (const file of files) console.log(`- ${file.path} (${file.bytes} bytes, ${file.sha256})`)
  process.exit(0)
}

if (mode === '--write') {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true })
  await fs.writeFile(manifestPath, `${JSON.stringify(manifestFor(files), null, 2)}\n`, 'utf8')
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  console.log(`Wrote photo source manifest: ${files.length} files, ${formatMiB(totalBytes)} -> ${manifestPath}`)
  process.exit(0)
}

const manifest = parseManifest(await fs.readFile(manifestPath, 'utf8'))
const current = indexFiles(files)
const expected = indexFiles(manifest.files)
const missing = manifest.files.filter((file) => !current.has(file.path))
const unexpected = files.filter((file) => !expected.has(file.path))
const changed = manifest.files.filter((file) => {
  const actual = current.get(file.path)
  return actual && (actual.bytes !== file.bytes || actual.sha256.toLowerCase() !== file.sha256.toLowerCase())
})

if (missing.length || unexpected.length || changed.length) {
  console.error(`Photo source manifest mismatch: ${missing.length} missing, ${unexpected.length} unexpected, ${changed.length} changed.`)
  for (const file of missing) console.error(`- missing: ${file.path}`)
  for (const file of unexpected) console.error(`- unexpected: ${file.path}`)
  for (const file of changed) console.error(`- changed: ${file.path}`)
  process.exit(1)
}

console.log(`Photo source manifest check passed: ${files.length} files, ${formatMiB(files.reduce((sum, file) => sum + file.bytes, 0))}.`)
