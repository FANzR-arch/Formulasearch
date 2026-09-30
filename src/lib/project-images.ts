import { getImage } from 'astro:assets'
import type { ImageMetadata } from 'astro'

const sources = import.meta.glob<ImageMetadata>('/public/uploads/projects/**/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' })

export interface ResponsiveImage {
  src: string
  srcset?: string
  width?: number
  height?: number
}

export const getProjectImageSize = (path: string) => {
  const source = sources[`/public${path}`]
  return source ? { width: source.width, height: source.height } : undefined
}

// Project galleries reference originals under /public; ship WebP variants sized for display
// instead of multi-megabyte PNG/JPEG. Unknown paths (e.g. GIFs) fall back to the original file.
export const getResponsiveProjectImage = async (path: string, widths: number[]): Promise<ResponsiveImage> => {
  const source = sources[`/public${path}`]
  if (!source) return { src: path }
  const usable = [...new Set(widths.map((width) => Math.min(width, source.width)))]
  const variants = await Promise.all(usable.map((width) => getImage({ src: source, width, format: 'webp', quality: 82 })))
  return {
    src: variants[variants.length - 1].src,
    srcset: variants.map((image, index) => `${image.src} ${usable[index]}w`).join(', '),
    width: source.width,
    height: source.height,
  }
}
