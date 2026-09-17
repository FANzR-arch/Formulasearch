// Public chat endpoint only; dev-only configuration can never enter a production build.
export function personalAiUrl(value, production = true) {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase()
    const local = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.') || host.includes(':') || /^\d+(\.\d+){3}$/.test(host)
    if (url.username || url.password || url.pathname.replace(/\/$/, '') !== '/chat') return undefined
    if (production ? url.protocol !== 'https:' || local : !['http:', 'https:'].includes(url.protocol)) return undefined
    url.search = ''
    url.hash = ''
    return url.href
  } catch { return undefined }
}
