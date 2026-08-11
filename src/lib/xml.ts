export const escapeXml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const jsonLdEscapes: Record<string, string> = {
  '&': '\\u0026',
  '<': '\\u003C',
  '>': '\\u003E',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replace(/[&<>\u2028\u2029]/g, (character) => jsonLdEscapes[character])
