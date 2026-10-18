// Manual publishing step: originals stay outside public; generated assets are committed.
// Requires the existing sharp dependency plus ffmpeg/ffprobe on PATH.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../', import.meta.url))
const catalog = JSON.parse(await readFile(path.join(root, 'src/data/gallery-source.json')))
const out = path.join(root, 'public/gallery')
await mkdir(out, { recursive: true })
const records = []
const probe = file => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }))
const encode = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
const measure = async file => {
  const bytes = (await stat(path.join(root, 'public', file))).size
  if (bytes >= 25 * 1024 * 1024) throw new Error(`Pages asset too large: ${file}`)
  return bytes
}
for (const item of catalog) {
  const source = path.join(root, item.source)
  const original = await readFile(source)
  const { source: sourcePath, posterTime, ...details } = item
  const record = { ...details, sourceFile: path.basename(sourcePath), sourceBytes: original.length, sourceSha256: createHash('sha256').update(original).digest('hex') }
  if (['photo', 'design'].includes(item.kind)) {
    const variants = []
    for (const width of [480, 960, 1600]) {
      const file = `gallery/${item.id}-${width}.webp`
      const info = await sharp(original).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(root, 'public', file))
      variants.push({ src: `/${file}`, width: info.width, height: info.height, bytes: await measure(file) })
    }
    record.variants = variants
  } else {
    const file = `gallery/${item.id}.mp4`
    // H.264/yuv420p + AAC works with native controls; faststart supports progressive playback.
    encode(['-i', source, '-map', '0:v:0', '-map', '0:a:0?', '-vf', "scale=w='min(1280,iw)':h=-2", '-c:v', 'libx264', '-preset', 'medium', '-crf', '25', '-pix_fmt', 'yuv420p', '-threads', '4', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-map_metadata', '-1', '-map_chapters', '-1', path.join(root, 'public', file)])
    const info = probe(path.join(root, 'public', file))
    const video = info.streams.find(stream => stream.codec_type === 'video')
    const poster = `gallery/${item.id}-poster.webp`
    encode(['-ss', String(posterTime), '-i', path.join(root, 'public', file), '-frames:v', '1', '-vf', 'scale=960:-2', '-quality', '80', path.join(root, 'public', poster)])
    Object.assign(record, { src: `/${file}`, bytes: await measure(file), width: video.width, height: video.height, duration: Number(info.format.duration), poster: `/${poster}`, posterBytes: await measure(poster) })
  }
  records.push(record)
  console.log(`Prepared ${item.id}`)
}
await writeFile(path.join(root, 'src/data/gallery.json'), JSON.stringify(records, null, 2) + '\n')
console.log(`Prepared ${records.length} gallery entries.`)
