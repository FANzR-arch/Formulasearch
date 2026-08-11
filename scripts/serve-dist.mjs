import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
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
  '.woff2': 'font/woff2',
}

if (!existsSync(join(distRoot, 'index.html'))) {
  throw new Error('dist/index.html 不存在，请先运行 npm run build')
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`)
  const pathname = decodeURIComponent(requestUrl.pathname)
  const relativePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname
  const candidate = normalize(join(distRoot, relativePath))
  const filePath = existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : normalize(join(distRoot, `${pathname.replace(/\/$/, '')}/index.html`))

  if (!filePath.startsWith(distRoot) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  })
  createReadStream(filePath).pipe(response)
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
