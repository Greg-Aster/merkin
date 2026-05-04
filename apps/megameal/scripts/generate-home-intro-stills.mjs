import { copyFile, mkdir, rm, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const outputDir = path.join('public', 'assets', 'banner', 'home-intro-stills')
const basisOutputDir = path.join('public', 'assets', 'vendor', 'basis')
const width = 768
const height = 432
const aspectRatio = height / width
const tempDir = path.join(outputDir, '.tmp')
const basisTranscoderFiles = [
  'basis_transcoder.js',
  'basis_transcoder.wasm',
]

const stills = [
  {
    name: 'home-intro',
    src: path.join('public', 'assets', 'banner', 'ComfyUI_00138_.webp'),
  },
  {
    name: 'timeline',
    src: path.join('public', 'posts', 'timeline', 'universe.png'),
  },
  {
    name: 'cookbook',
    src: path.join('public', 'posts', 'cookbook', 'cookbook.png'),
  },
  {
    name: 'archive',
    src: path.join('public', 'assets', 'banner', 'archive_still.png'),
  },
  {
    name: 'game',
    src: path.join('public', 'assets', 'banner', 'ComfyUI_0144.png'),
  },
  {
    name: 'store',
    src: path.join('public', 'assets', 'banner', 'ultra-headquarters.png'),
  },
  {
    name: 'community',
    src: path.join('public', 'posts', 'timeline', 'golden-era.png'),
  },
  {
    name: 'story-mode',
    src: path.join('public', 'posts', 'building.png'),
  },
]

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', chunk => {
      stdout += chunk
    })
    child.stderr.on('data', chunk => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      reject(
        new Error(
          `${command} ${args.join(' ')} exited with ${code}\n${stdout}${stderr}`,
        ),
      )
    })
  })
}

function toMultipleOfFour(value) {
  return Math.max(4, Math.floor(value / 4) * 4)
}

await mkdir(outputDir, { recursive: true })
await mkdir(tempDir, { recursive: true })
await mkdir(basisOutputDir, { recursive: true })

for (const file of basisTranscoderFiles) {
  const source = fileURLToPath(
    import.meta.resolve(`three/examples/jsm/libs/basis/${file}`),
  )
  await copyFile(source, path.join(basisOutputDir, file))
}

for (const still of stills) {
  const webpDestination = path.join(outputDir, `${still.name}.webp`)
  const ktx2Destination = path.join(outputDir, `${still.name}.ktx2`)
  const pngIntermediate = path.join(tempDir, `${still.name}.png`)
  const sourceStats = await stat(still.src)
  const metadata = await sharp(still.src).metadata()
  const targetWidth = toMultipleOfFour(Math.min(width, metadata.width ?? width))
  const targetHeight = toMultipleOfFour(targetWidth * aspectRatio)

  await sharp(still.src)
    .rotate()
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: 'cover',
      position: 'centre',
    })
    .webp({
      quality: 76,
      effort: 5,
      smartSubsample: true,
    })
    .toFile(webpDestination)

  await sharp(still.src)
    .rotate()
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: 'cover',
      position: 'centre',
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
    })
    .toFile(pngIntermediate)

  await run('toktx', [
    '--t2',
    '--encode',
    'etc1s',
    '--qlevel',
    '160',
    '--clevel',
    '3',
    '--genmipmap',
    '--assign_oetf',
    'srgb',
    '--assign_primaries',
    'srgb',
    ktx2Destination,
    pngIntermediate,
  ])

  const webpStats = await stat(webpDestination)
  const ktx2Stats = await stat(ktx2Destination)
  console.log(
    `${still.name}: ${formatBytes(sourceStats.size)} -> ${formatBytes(webpStats.size)} WebP / ${formatBytes(ktx2Stats.size)} KTX2`,
  )
}

await rm(tempDir, { recursive: true, force: true })
