import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const sourceDir = path.join(appRoot, 'public/assets/sprites/tentacle/24 frame')
const outputDir = path.join(appRoot, 'public/assets/sprites/tentacle/tiles')
const manifestPath = path.join(outputDir, 'manifest.json')

const sourceFrameStart = 25
const frameCount = 24
const tileCount = 6
const expectedSourceWidth = 2160
const expectedSourceHeight = 3840
const edgeArtifactInset = 48
const meaningfulAlphaThreshold = 17
const meaningfulColorThreshold = 24
const minimumVisiblePixelsPerColumn = 32
const horizontalPadding = 80
const cropAlignment = 16

function frameSourcePath(frameIndex) {
  const sourceFrame = sourceFrameStart + frameIndex
  return path.join(
    sourceDir,
    `ComfyUI_${String(sourceFrame).padStart(4, '0')}.webp`,
  )
}

function tileFileName(frameIndex, tileIndex) {
  return `frame-${String(frameIndex).padStart(2, '0')}-tile-${tileIndex}.webp`
}

function alignDown(value, alignment) {
  return Math.floor(value / alignment) * alignment
}

function alignUp(value, alignment) {
  return Math.ceil(value / alignment) * alignment
}

function clearExteriorDarkPixels(data, width, height) {
  const visited = new Uint8Array(width * height)
  const queue = new Uint32Array(width * height)
  let head = 0
  let tail = 0
  let clearedPixels = 0

  function isExteriorCandidate(pixelIndex) {
    const offset = pixelIndex * 4
    const alpha = data[offset + 3]
    const brightness = Math.max(
      data[offset],
      data[offset + 1],
      data[offset + 2],
    )
    return (
      alpha < meaningfulAlphaThreshold || brightness < meaningfulColorThreshold
    )
  }

  function admit(pixelIndex) {
    if (visited[pixelIndex] || !isExteriorCandidate(pixelIndex)) return
    visited[pixelIndex] = 1
    queue[tail] = pixelIndex
    tail += 1
  }

  for (let x = 0; x < width; x += 1) {
    admit(x)
    admit((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    admit(y * width)
    admit(y * width + width - 1)
  }

  while (head < tail) {
    const pixelIndex = queue[head]
    head += 1
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)

    if (x > 0) admit(pixelIndex - 1)
    if (x + 1 < width) admit(pixelIndex + 1)
    if (y > 0) admit(pixelIndex - width)
    if (y + 1 < height) admit(pixelIndex + width)
  }

  for (let pixelIndex = 0; pixelIndex < visited.length; pixelIndex += 1) {
    if (!visited[pixelIndex]) continue
    const alphaOffset = pixelIndex * 4 + 3
    if (data[alphaOffset] >= meaningfulAlphaThreshold) clearedPixels += 1
    data[alphaOffset] = 0
  }

  return clearedPixels
}

async function inspectFrame(sourcePath) {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (
    info.width !== expectedSourceWidth ||
    info.height !== expectedSourceHeight ||
    info.channels !== 4
  ) {
    throw new Error(
      `${sourcePath} must be ${expectedSourceWidth}x${expectedSourceHeight} RGBA; received ${info.width}x${info.height} with ${info.channels} channels`,
    )
  }

  let left = info.width
  let right = -1
  for (let x = edgeArtifactInset; x < info.width - edgeArtifactInset; x += 1) {
    let visiblePixels = 0
    for (let y = 0; y < info.height; y += 1) {
      const offset = (y * info.width + x) * info.channels
      const alpha = data[offset + 3]
      const brightness = Math.max(
        data[offset],
        data[offset + 1],
        data[offset + 2],
      )
      if (
        alpha >= meaningfulAlphaThreshold &&
        brightness >= meaningfulColorThreshold
      ) {
        visiblePixels += 1
      }
    }
    if (visiblePixels < minimumVisiblePixelsPerColumn) continue
    left = Math.min(left, x)
    right = x
  }

  if (right < left) {
    throw new Error(`${sourcePath} has no visible tentacle pixels`)
  }

  return { left, right }
}

async function getSharedCrop() {
  let sharedLeft = expectedSourceWidth
  let sharedRight = -1

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const bounds = await inspectFrame(frameSourcePath(frameIndex))
    sharedLeft = Math.min(sharedLeft, bounds.left)
    sharedRight = Math.max(sharedRight, bounds.right)
  }

  const left = Math.max(
    edgeArtifactInset,
    alignDown(sharedLeft - horizontalPadding, cropAlignment),
  )
  const right = Math.min(
    expectedSourceWidth - edgeArtifactInset,
    alignUp(sharedRight + horizontalPadding + 1, cropAlignment),
  )
  return {
    left,
    width: right - left,
  }
}

async function generateTiles() {
  const crop = await getSharedCrop()
  if (expectedSourceHeight % tileCount !== 0) {
    throw new Error(
      `${expectedSourceHeight}px cannot be divided into ${tileCount} equal tiles`,
    )
  }

  const tileHeight = expectedSourceHeight / tileCount
  const tiles = Array.from({ length: tileCount }, (_, index) => ({
    index,
    sourceY: index * tileHeight,
    sourceHeight: tileHeight,
  }))

  await rm(outputDir, { force: true, recursive: true })
  await mkdir(outputDir, { recursive: true })

  let encodedBytes = 0
  let clearedMattePixels = 0
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const sourcePath = frameSourcePath(frameIndex)
    const { data, info } = await sharp(sourcePath, { sequentialRead: true })
      .extract({
        left: crop.left,
        top: 0,
        width: crop.width,
        height: expectedSourceHeight,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    clearedMattePixels += clearExteriorDarkPixels(data, info.width, info.height)
    const sourceImage = sharp(data, { raw: info })
    const frameStats = await Promise.all(
      tiles.map(async tile => {
        const destination = path.join(
          outputDir,
          tileFileName(frameIndex, tile.index),
        )
        await sourceImage
          .clone()
          .extract({
            left: 0,
            top: tile.sourceY,
            width: crop.width,
            height: tile.sourceHeight,
          })
          .webp({
            quality: 95,
            alphaQuality: 100,
            effort: 6,
            smartSubsample: false,
          })
          .toFile(destination)
        return stat(destination)
      }),
    )
    encodedBytes += frameStats.reduce((sum, entry) => sum + entry.size, 0)
  }

  const manifest = {
    version: 1,
    frameCount,
    sourceFrameStart,
    sourceWidth: expectedSourceWidth,
    sourceHeight: expectedSourceHeight,
    crop,
    renderAspect: crop.width / expectedSourceHeight,
    alphaTest: meaningfulAlphaThreshold / 255,
    tileCount,
    tiles,
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(
    `[tentacle-tiles] Generated ${frameCount * tileCount} tiles (${(encodedBytes / 1024 / 1024).toFixed(2)} MB) with crop x=${crop.left}, width=${crop.width}; cleared ${clearedMattePixels} exterior matte pixels.`,
  )
}

await generateTiles()
