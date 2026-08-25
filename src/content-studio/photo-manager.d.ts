export interface PhotoArchiveItem {
  alt: { zh: string; en: string }
  assetHash: string
  image: string
  previewImage?: string
  tags: string[]
  [key: string]: unknown
}
export interface PhotoArchive { items: PhotoArchiveItem[]; [key: string]: unknown }
export function readPhotoArchive(): Promise<PhotoArchive>
export function importPhotoFiles(paths: string[]): Promise<{ imported: number; duplicates: number; total: number }>
export function importPhotoFolder(path: string): Promise<{ imported: number; duplicates: number; total: number }>
export function deletePhoto(assetHash: string): Promise<{ deleted: string; total: number }>
export function updatePhotoItems(items: PhotoArchiveItem[]): Promise<{ updated: number }>
