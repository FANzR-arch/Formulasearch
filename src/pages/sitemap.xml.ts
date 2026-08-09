import type { APIRoute } from 'astro'

const pages = ['/']

export const GET: APIRoute = () => {
  const today = new Date().toISOString().slice(0, 10)
  const urls = pages
    .map((path) => `<url><loc>https://formulasearch.com${path}</loc><lastmod>${today}</lastmod></url>`)
    .join('')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
