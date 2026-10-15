import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { siteConfig } from '../config/config'
import { url } from '../utils/url-utils'

// Public article artwork stays unchanged. Static JPEG derivatives are used by
// link previews, including for SVG diagrams that card crawlers cannot render.
async function renderImage(source: string) {
  if (!source.startsWith('/') || source.startsWith('//')) {
    throw new Error(`Sharing artwork must be a local public asset: ${source}`)
  }
  const publicDir = path.resolve('public')
  const filename = path.resolve(publicDir, `.${source}`)
  if (!filename.startsWith(`${publicDir}${path.sep}`)) throw new Error(`Invalid sharing artwork path: ${source}`)
  const original = await readFile(filename)
  const { data, info } = await sharp(original).rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }).jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true })
  const id = createHash('sha256').update(new Uint8Array(data)).digest('hex').slice(0, 24)
  return { id, data, src: url(`/social/${id}.jpg`), width: info.width, height: info.height, type: 'image/jpeg' }
}

const images = new Map<string, ReturnType<typeof renderImage>>()
export function getSocialImage(source = siteConfig.banner.src) {
  if (!images.has(source)) images.set(source, renderImage(source))
  return images.get(source)!
}

export async function getPageSocialImage(props: { post?: { data: { image?: string } }; banner?: string }) {
  const { src, width, height, type } = await getSocialImage(props.post?.data?.image || props.banner || siteConfig.banner.src)
  return { src, width, height, type }
}
