import assert from 'node:assert/strict'
import { readFile, stat, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = path.join(root, 'dist')
const entries = JSON.parse(await readFile(path.join(root, 'src/data/gallery.json')))
const html = await readFile(path.join(dist, 'gallery/index.html'), 'utf8')
const base = `/${(process.env.SITE_BASE || '/').split('/').filter(Boolean).join('/')}/`.replace(/\/+/g, '/')
const attribute = (tag, name) => {
  const value = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`))
  return value?.[1] ?? value?.[2] ?? value?.[3]
}
assert.match(html, /data-pagefind-body/)
assert.equal((html.match(/<h1\b/g) || []).length, 1)
assert.equal((html.match(/<figure\b/g) || []).length, entries.length)
const videos = [...html.matchAll(/<video\b[^>]*>/g)].map(([tag]) => tag)
assert.equal(videos.length, entries.filter(item => item.src).length)
for (const video of videos) {
  assert.equal(attribute(video, 'preload'), 'none')
  assert.match(video, /\bcontrols\b/)
  assert.doesNotMatch(video, /\bautoplay\b/)
  assert.ok(attribute(video, 'poster'))
}
const sources = [...html.matchAll(/<(?:img|source|a)\b[^>]*>/g)].flatMap(([tag]) => [attribute(tag, 'src'), attribute(tag, 'href')]).filter(Boolean)
for (const item of entries) {
  for (const variant of item.variants || []) {
    const file = path.join(dist, variant.src)
    const info = await sharp(file).metadata()
    assert.equal(info.format, 'webp')
    assert.equal(info.width, variant.width)
    assert.equal(info.height, variant.height)
    assert.ok(!info.exif, 'Public gallery images must omit camera metadata')
    assert.ok(html.includes(`${base}${variant.src.slice(1)}`), `Missing responsive variant ${variant.src}`)
  }
  if (item.src) {
    assert.ok(sources.includes(`${base}${item.src.slice(1)}`))
    const file = path.join(dist, item.src)
    assert.equal((await stat(file)).size, item.bytes, 'Build must contain the complete encoded video')
    const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }))
    const video = info.streams.find(stream => stream.codec_type === 'video')
    assert.equal(video.codec_name, 'h264')
    assert.equal(video.pix_fmt, 'yuv420p')
    assert.ok(Math.abs(Number(info.format.duration) - item.duration) < .05)
    for (const audio of info.streams.filter(stream => stream.codec_type === 'audio')) assert.equal(audio.codec_name, 'aac')
    const bytes = await readFile(file)
    assert.ok(bytes.indexOf('moov') < bytes.indexOf('mdat'), 'MP4 must allow progressive playback')
  }
}
async function checkAssets(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) await checkAssets(file)
    else assert.ok((await stat(file)).size < 25 * 1024 * 1024, `Cloudflare Pages asset exceeds 25 MiB: ${file}`)
  }
}
await checkAssets(dist)
assert.doesNotMatch(html, /media-originals|capture-info\.json/)
const sitemap = await readFile(path.join(dist, 'sitemap-0.xml'), 'utf8')
assert.ok(sitemap.includes(`${base}gallery/`), 'Gallery must be discoverable in the sitemap')
console.log(`Gallery checks passed: ${entries.length} entries, responsive WebP, ${videos.length} H.264 videos, progressive playback and Pages asset limits.`)
