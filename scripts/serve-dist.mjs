import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distRoot = resolve(projectRoot, 'dist')
const port = Number(process.env.PORT || 4321)
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
}

if (!existsSync(join(distRoot, 'index.html'))) {
  throw new Error('dist/index.html 不存在，请先运行 npm run build')
}

const server = createServer((request, response) => {
  const rawPathname = (request.url || '/').split(/[?#]/, 1)[0] || '/'
  let pathname
  try {
    pathname = decodeURIComponent(rawPathname)
  } catch {
    response.writeHead(400)
    response.end('Bad request')
    return
  }
  if (!pathname.startsWith('/') || pathname.split('/').some((segment) => segment === '.' || segment === '..')) {
    response.writeHead(404)
    response.end('Not found')
    return
  }
  const relativePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname
  const candidate = normalize(join(distRoot, relativePath))
  const filePath = existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : normalize(join(distRoot, `${pathname.replace(/\/$/, '')}/index.html`))

  const isInsideDist = filePath === distRoot || filePath.startsWith(`${distRoot}${sep}`)
  if (!isInsideDist || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  const size = statSync(filePath).size
  const headers = {
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'Accept-Ranges': 'bytes',
  }
  // Native video seeking requests byte ranges instead of downloading the full file.
  const range = request.method === 'GET' && /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || '')
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
    if ((!range[1] && !range[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      response.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` })
      response.end()
      return
    }
    response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}` })
    createReadStream(filePath, { start, end }).pipe(response)
    return
  }
  response.writeHead(200, { ...headers, 'Content-Length': size })
  if (request.method === 'HEAD') response.end()
  else createReadStream(filePath).pipe(response)
})

let shuttingDown = false
const shutdown = () => {
  if (shuttingDown) return
  shuttingDown = true
  server.closeAllConnections?.()
  const forceExit = setTimeout(() => process.exit(0), 1_000)
  server.close(() => {
    clearTimeout(forceExit)
    process.exit(0)
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
server.listen(port, '127.0.0.1')
