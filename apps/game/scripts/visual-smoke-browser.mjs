import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'
import {
  assertRequiredRenderActors,
  assertRuntimeRenderLifecycle,
  createFilterSet,
  isTransientConsoleMessage,
  launchBrowser,
  normalizeBrowserName,
  parseArgValue,
  shouldIgnoreConsoleMessage,
  shouldIgnoreRequestFailure,
  waitForPlayableLevel,
} from './lib/browserHarness.mjs'

const PNG_SIGNATURE = '89504e470d0a1a0a'
const DEFAULT_LEVELS = ['solitude', 'yggdrasil', 'sci-fi-room']
const AVAILABLE_LEVELS = [...DEFAULT_LEVELS, 'miranda', 'observatory']
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const args = process.argv.slice(2)
const browserName = normalizeBrowserName(
  parseArgValue(args, 'browser', process.env.GAME_BROWSER || 'chromium'),
)
const appOrigin = `http://127.0.0.1:${process.env.GAME_DEV_PORT || 4322}`
const levelFilter = parseArgValue(
  args,
  'level',
  process.env.GAME_VISUAL_LEVEL || '',
)
const writeArtifacts =
  args.includes('--write-artifacts') ||
  process.env.GAME_VISUAL_ARTIFACTS === '1'
const updateBaselines =
  args.includes('--update-baselines') ||
  process.env.GAME_VISUAL_UPDATE_BASELINES === '1'
const useBaselines =
  !args.includes('--skip-baselines') &&
  process.env.GAME_VISUAL_BASELINES !== '0'
const artifactDir = resolve(
  repoRoot,
  parseArgValue(
    args,
    'artifact-dir',
    process.env.GAME_VISUAL_ARTIFACT_DIR || 'apps/game/.visual-smoke',
  ),
)
const baselinePath = resolve(
  repoRoot,
  parseArgValue(
    args,
    'baseline',
    process.env.GAME_VISUAL_BASELINE_PATH || 'apps/game/visual-baselines.json',
  ),
)
const requestedLevels = levelFilter
  ? AVAILABLE_LEVELS.filter(levelId =>
      createFilterSet(levelFilter).has(levelId),
    )
  : DEFAULT_LEVELS

const levelContracts = {
  solitude: {
    cameraBookmark: {
      id: 'spawn-default',
      viewport: { width: 1280, height: 720 },
      settleMs: 2000,
    },
    requiredRenderedActors: ['solitude-ground-plateau', 'solitude-ground-dais'],
    maxLightPixelRatio: 0.72,
    streaming: {
      partitioned: true,
      minActiveCells: 1,
      minReadinessGates: 5,
      minInitialCells: 1,
    },
  },
  yggdrasil: {
    cameraBookmark: {
      id: 'spawn-default',
      viewport: { width: 1280, height: 720 },
      settleMs: 2000,
    },
    requiredRenderedActors: ['yggdrasil-ground', 'yggdrasil-spawn-pad'],
    streaming: {
      partitioned: true,
      minActiveCells: 1,
      minReadinessGates: 5,
      minInitialCells: 1,
    },
  },
  'sci-fi-room': {
    cameraBookmark: {
      id: 'spawn-default',
      viewport: { width: 1280, height: 720 },
      settleMs: 2000,
    },
    minUniqueColorBuckets: 24,
    minLumaStdDev: 6,
  },
  miranda: {
    cameraBookmark: {
      id: 'spawn-default',
      viewport: { width: 1280, height: 720 },
      settleMs: 2000,
    },
    requiredRenderedActors: ['miranda-floor-main', 'miranda-floor-upper'],
    minUniqueColorBuckets: 24,
    minLumaStdDev: 6,
  },
  observatory: {
    cameraBookmark: {
      id: 'spawn-default',
      viewport: { width: 1280, height: 720 },
      settleMs: 2000,
    },
    minUniqueColorBuckets: 24,
    minLumaStdDev: 5,
  },
}
const sceneVisualBookmarks = Object.fromEntries(
  AVAILABLE_LEVELS.map(levelId => [levelId, loadSceneVisualBookmark(levelId)]),
)

const visualBaselines = loadVisualBaselines()

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset)
}

function decodePng(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    throw new Error('Screenshot is not a PNG image.')
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks = []

  while (offset < buffer.length) {
    const length = readUInt32(buffer, offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = readUInt32(data, 0)
      height = readUInt32(data, 4)
      bitDepth = data[8]
      colorType = data[9]
      const compression = data[10]
      const filter = data[11]
      const interlace = data[12]
      if (
        bitDepth !== 8 ||
        compression !== 0 ||
        filter !== 0 ||
        interlace !== 0
      ) {
        throw new Error('Unsupported PNG format for visual smoke analysis.')
      }
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (!width || !height || !channels) {
    throw new Error(`Unsupported PNG color type ${colorType}.`)
  }

  const inflated = inflateSync(Buffer.concat(idatChunks))
  const stride = width * channels
  const pixels = new Uint8Array(width * height * 4)
  let inputOffset = 0
  let previous = new Uint8Array(stride)

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inputOffset]
    inputOffset += 1
    const row = inflated.subarray(inputOffset, inputOffset + stride)
    inputOffset += stride
    const decoded = new Uint8Array(stride)

    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? decoded[index - channels] : 0
      const up = previous[index] ?? 0
      const upperLeft = index >= channels ? previous[index - channels] : 0
      const predictor = (() => {
        const p = left + up - upperLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upperLeft)
        if (pa <= pb && pa <= pc) return left
        if (pb <= pc) return up
        return upperLeft
      })()
      const filterValue =
        filterType === 0
          ? 0
          : filterType === 1
            ? left
            : filterType === 2
              ? up
              : filterType === 3
                ? Math.floor((left + up) / 2)
                : filterType === 4
                  ? predictor
                  : null
      if (filterValue === null) {
        throw new Error(`Unsupported PNG filter type ${filterType}.`)
      }
      decoded[index] = (row[index] + filterValue) & 0xff
    }

    for (let x = 0; x < width; x += 1) {
      const sourceIndex = x * channels
      const outputIndex = (y * width + x) * 4
      pixels[outputIndex] = decoded[sourceIndex]
      pixels[outputIndex + 1] = decoded[sourceIndex + 1]
      pixels[outputIndex + 2] = decoded[sourceIndex + 2]
      pixels[outputIndex + 3] = channels === 4 ? decoded[sourceIndex + 3] : 255
    }

    previous = decoded
  }

  return { width, height, pixels }
}

function analyzeScreenshot(buffer) {
  const { width, height, pixels } = decodePng(buffer)
  const sampleStride = Math.max(1, Math.floor(Math.min(width, height) / 180))
  const tileGridSize = 8
  const tileCount = tileGridSize * tileGridSize
  const tileStats = Array.from({ length: tileCount }, () => ({
    count: 0,
    red: 0,
    green: 0,
    blue: 0,
    luma: 0,
  }))
  const colorBuckets = new Set()
  let opaquePixels = 0
  let lightPixels = 0
  let darkPixels = 0
  let lumaSum = 0
  let lumaSquaredSum = 0
  let edgeSum = 0
  let edgeSamples = 0

  for (let y = 0; y < height; y += sampleStride) {
    for (let x = 0; x < width; x += sampleStride) {
      const index = (y * width + x) * 4
      const alpha = pixels[index + 3]
      if (alpha < 16) continue

      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue
      const tileX = Math.min(
        tileGridSize - 1,
        Math.floor((x / width) * tileGridSize),
      )
      const tileY = Math.min(
        tileGridSize - 1,
        Math.floor((y / height) * tileGridSize),
      )
      const tile = tileStats[tileY * tileGridSize + tileX]
      tile.count += 1
      tile.red += red
      tile.green += green
      tile.blue += blue
      tile.luma += luma
      opaquePixels += 1
      lumaSum += luma
      lumaSquaredSum += luma * luma
      if (red > 240 && green > 240 && blue > 240) lightPixels += 1
      if (luma < 10) darkPixels += 1
      colorBuckets.add(
        `${Math.floor(red / 16)},${Math.floor(green / 16)},${Math.floor(blue / 16)}`,
      )

      if (x + sampleStride < width) {
        const rightIndex = (y * width + x + sampleStride) * 4
        edgeSum +=
          Math.abs(red - pixels[rightIndex]) +
          Math.abs(green - pixels[rightIndex + 1]) +
          Math.abs(blue - pixels[rightIndex + 2])
        edgeSamples += 1
      }
      if (y + sampleStride < height) {
        const downIndex = ((y + sampleStride) * width + x) * 4
        edgeSum +=
          Math.abs(red - pixels[downIndex]) +
          Math.abs(green - pixels[downIndex + 1]) +
          Math.abs(blue - pixels[downIndex + 2])
        edgeSamples += 1
      }
    }
  }

  const meanLuma = opaquePixels > 0 ? lumaSum / opaquePixels : 0
  const lumaVariance =
    opaquePixels > 0 ? lumaSquaredSum / opaquePixels - meanLuma * meanLuma : 0

  return {
    width,
    height,
    opaquePixels,
    uniqueColorBuckets: colorBuckets.size,
    meanLuma: Math.round(meanLuma * 10) / 10,
    lumaStdDev: Math.round(Math.sqrt(Math.max(0, lumaVariance)) * 10) / 10,
    lightPixelRatio: opaquePixels > 0 ? lightPixels / opaquePixels : 1,
    darkPixelRatio: opaquePixels > 0 ? darkPixels / opaquePixels : 1,
    edgeScore:
      edgeSamples > 0 ? Math.round((edgeSum / edgeSamples) * 10) / 10 : 0,
    tiles: tileStats.map(tile => ({
      red: tile.count > 0 ? Math.round(tile.red / tile.count) : 0,
      green: tile.count > 0 ? Math.round(tile.green / tile.count) : 0,
      blue: tile.count > 0 ? Math.round(tile.blue / tile.count) : 0,
      luma: tile.count > 0 ? Math.round((tile.luma / tile.count) * 10) / 10 : 0,
    })),
  }
}

function loadVisualBaselines() {
  if (!useBaselines && !updateBaselines) {
    return { version: 1, levels: {} }
  }
  if (!existsSync(baselinePath)) {
    if (updateBaselines) return { version: 1, levels: {} }
    throw new Error(
      `Missing visual baseline file ${baselinePath}. Run smoke:visual with --update-baselines after reviewing artifacts.`,
    )
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  if (
    baseline.version !== 1 ||
    !baseline.levels ||
    typeof baseline.levels !== 'object'
  ) {
    throw new Error(`${baselinePath} is not a supported visual baseline file.`)
  }
  return baseline
}

function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function loadSceneVisualBookmark(levelId) {
  const scenePath = join(
    repoRoot,
    'apps/game/src/threlte/editor/scenes',
    `${levelId}.scene.json`,
  )
  if (!existsSync(scenePath)) return null

  const scene = JSON.parse(readFileSync(scenePath, 'utf8'))
  const bookmarks = scene.settings?.level?.renderProfile?.visualBookmarks
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) return null

  const bookmark = bookmarks[0]
  if (
    typeof bookmark.id !== 'string' ||
    bookmark.id.length === 0 ||
    !isFiniteVec3(bookmark.cameraPosition) ||
    !isFiniteVec3(bookmark.cameraTarget)
  ) {
    throw new Error(`${levelId}: malformed renderProfile.visualBookmarks[0]`)
  }

  return {
    id: bookmark.id,
    viewport: {
      width: bookmark.viewport?.width ?? 1280,
      height: bookmark.viewport?.height ?? 720,
    },
    settleMs: bookmark.settleMs ?? 2000,
  }
}

function getCameraBookmark(levelId) {
  return (
    sceneVisualBookmarks[levelId] ??
    levelContracts[levelId]?.cameraBookmark ?? {
      id: 'spawn-default',
      viewport: { width: 1280, height: 720 },
      settleMs: 2000,
    }
  )
}

function buildLevelUrl(levelId, bookmark) {
  const url = new URL(appOrigin)
  url.searchParams.set('level', levelId)
  url.searchParams.set('debug', '1')
  url.searchParams.set('debugLogs', '1')
  url.searchParams.set('visualBookmark', bookmark.id)
  return url.toString()
}

function buildVisualBaselineRecord(levelId, metrics, bookmark) {
  return {
    levelId,
    bookmark: bookmark.id,
    viewport: bookmark.viewport,
    capturedBy: 'scripts/visual-smoke-browser.mjs',
    metrics: {
      width: metrics.width,
      height: metrics.height,
      opaquePixels: metrics.opaquePixels,
      uniqueColorBuckets: metrics.uniqueColorBuckets,
      meanLuma: metrics.meanLuma,
      lumaStdDev: metrics.lumaStdDev,
      lightPixelRatio: Number(metrics.lightPixelRatio.toFixed(4)),
      darkPixelRatio: Number(metrics.darkPixelRatio.toFixed(4)),
      edgeScore: metrics.edgeScore,
      tiles: metrics.tiles,
    },
  }
}

function assertVisualBaseline(levelId, metrics, bookmark) {
  if (!useBaselines && !updateBaselines) return

  const nextRecord = buildVisualBaselineRecord(levelId, metrics, bookmark)
  if (updateBaselines) {
    visualBaselines.levels[levelId] = nextRecord
    return
  }

  const baseline = visualBaselines.levels[levelId]
  if (!baseline) {
    throw new Error(
      `${levelId} missing visual baseline. Run smoke:visual with --update-baselines after reviewing artifacts.`,
    )
  }

  const expected = baseline.metrics
  const failures = []
  const tolerances = {
    meanLuma: 14,
    lumaStdDev: 14,
    lightPixelRatio: 0.18,
    darkPixelRatio: 0.22,
    edgeScore: 12,
    tileMean: 42,
    maxTileFailureRatio: 0.35,
  }

  if (baseline.bookmark !== bookmark.id) {
    failures.push(`bookmark ${bookmark.id} !== baseline ${baseline.bookmark}`)
  }
  if (expected.width !== metrics.width || expected.height !== metrics.height) {
    failures.push(
      `viewport ${metrics.width}x${metrics.height} !== baseline ${expected.width}x${expected.height}`,
    )
  }
  if (
    metrics.uniqueColorBuckets < Math.floor(expected.uniqueColorBuckets * 0.55)
  ) {
    failures.push(
      `color buckets ${metrics.uniqueColorBuckets} < baseline floor ${Math.floor(expected.uniqueColorBuckets * 0.55)}`,
    )
  }
  for (const key of [
    'meanLuma',
    'lumaStdDev',
    'lightPixelRatio',
    'darkPixelRatio',
    'edgeScore',
  ]) {
    const delta = Math.abs(metrics[key] - expected[key])
    if (delta > tolerances[key]) {
      failures.push(
        `${key} delta ${delta.toFixed(3)} > ${tolerances[key]} (actual ${metrics[key]}, baseline ${expected[key]})`,
      )
    }
  }

  const expectedTiles = Array.isArray(expected.tiles) ? expected.tiles : []
  if (expectedTiles.length !== metrics.tiles.length) {
    failures.push(
      `tile signature size ${metrics.tiles.length} !== baseline ${expectedTiles.length}`,
    )
  } else {
    let failedTiles = 0
    let lumaDeltaSum = 0
    for (let index = 0; index < metrics.tiles.length; index += 1) {
      const actualTile = metrics.tiles[index]
      const expectedTile = expectedTiles[index]
      const meanDelta =
        (Math.abs(actualTile.red - expectedTile.red) +
          Math.abs(actualTile.green - expectedTile.green) +
          Math.abs(actualTile.blue - expectedTile.blue) +
          Math.abs(actualTile.luma - expectedTile.luma)) /
        4
      lumaDeltaSum += Math.abs(actualTile.luma - expectedTile.luma)
      if (meanDelta > tolerances.tileMean) failedTiles += 1
    }
    const failedTileRatio = failedTiles / Math.max(1, metrics.tiles.length)
    const averageLumaDelta = lumaDeltaSum / Math.max(1, metrics.tiles.length)
    if (failedTileRatio > tolerances.maxTileFailureRatio) {
      failures.push(
        `tile drift ratio ${failedTileRatio.toFixed(3)} > ${tolerances.maxTileFailureRatio}`,
      )
    }
    if (averageLumaDelta > tolerances.tileMean) {
      failures.push(
        `average tile luma delta ${averageLumaDelta.toFixed(1)} > ${tolerances.tileMean}`,
      )
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `${levelId} visual baseline failed for ${bookmark.id}: ${failures.join('; ')}`,
    )
  }
}

function writeVisualBaselines() {
  if (!updateBaselines) return

  const nextBaseline = {
    version: 1,
    updatedAt: new Date().toISOString(),
    levels: Object.fromEntries(
      Object.entries(visualBaselines.levels).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  }
  mkdirSync(dirname(baselinePath), { recursive: true })
  writeFileSync(baselinePath, `${JSON.stringify(nextBaseline, null, 2)}\n`)
}

function assertVisualMetrics(levelId, metrics) {
  const contract = levelContracts[levelId] ?? {}
  const failures = []
  const minOpaquePixels = contract.minOpaquePixels ?? 1000
  const minUniqueColorBuckets = contract.minUniqueColorBuckets ?? 32
  const minLumaStdDev = contract.minLumaStdDev ?? 8
  const maxLightPixelRatio = contract.maxLightPixelRatio ?? 0.92
  const maxDarkPixelRatio = contract.maxDarkPixelRatio ?? 0.98
  const minEdgeScore = contract.minEdgeScore ?? 2

  if (metrics.width < 320 || metrics.height < 240) {
    failures.push(
      `canvas screenshot too small ${metrics.width}x${metrics.height}`,
    )
  }
  if (metrics.opaquePixels < minOpaquePixels) {
    failures.push(
      `opaque pixel count ${metrics.opaquePixels} < ${minOpaquePixels}`,
    )
  }
  if (metrics.uniqueColorBuckets < minUniqueColorBuckets) {
    failures.push(
      `unique color buckets ${metrics.uniqueColorBuckets} < ${minUniqueColorBuckets}`,
    )
  }
  if (metrics.lumaStdDev < minLumaStdDev) {
    failures.push(`luma stddev ${metrics.lumaStdDev} < ${minLumaStdDev}`)
  }
  if (metrics.lightPixelRatio > maxLightPixelRatio) {
    failures.push(
      `light pixel ratio ${metrics.lightPixelRatio.toFixed(3)} > ${maxLightPixelRatio}`,
    )
  }
  if (metrics.darkPixelRatio > maxDarkPixelRatio) {
    failures.push(
      `dark pixel ratio ${metrics.darkPixelRatio.toFixed(3)} > ${maxDarkPixelRatio}`,
    )
  }
  if (metrics.edgeScore < minEdgeScore) {
    failures.push(`edge score ${metrics.edgeScore} < ${minEdgeScore}`)
  }

  if (failures.length > 0) {
    throw new Error(
      `${levelId} visual screenshot failed: ${failures.join('; ')}`,
    )
  }
}

async function assertRenderedActors(page, levelId) {
  const requiredRenderedActors =
    levelContracts[levelId]?.requiredRenderedActors ?? []
  if (requiredRenderedActors.length === 0) return

  const missingActorIds = await page.evaluate(
    ({ level, actors }) => {
      const rendered = new Set(
        window.__gameRuntimeRenderState?.rendered?.[level] ?? [],
      )
      return actors.filter(actorId => !rendered.has(actorId))
    },
    { level: levelId, actors: requiredRenderedActors },
  )

  if (missingActorIds.length > 0) {
    throw new Error(
      `${levelId} visual smoke missing rendered actors: ${missingActorIds.join(', ')}`,
    )
  }
}

async function assertStreamingTelemetry(page, levelId) {
  const contract = levelContracts[levelId]?.streaming
  if (!contract) return

  const telemetry = await page.evaluate(
    level => window.__gameRuntimeStreamingState?.levels?.[level] ?? null,
    levelId,
  )
  if (!telemetry) {
    throw new Error(
      `${levelId} visual smoke missing runtime streaming telemetry.`,
    )
  }

  const failures = []
  const minRequiredRenderableActors =
    contract.minRequiredRenderableActors ??
    levelContracts[levelId]?.requiredRenderedActors?.length ??
    0

  if (telemetry.partitioned !== contract.partitioned) {
    failures.push(
      `partitioned ${telemetry.partitioned} !== ${contract.partitioned}`,
    )
  }
  if (telemetry.activeCellCount < contract.minActiveCells) {
    failures.push(
      `active cells ${telemetry.activeCellCount} < ${contract.minActiveCells}`,
    )
  }
  if (telemetry.readinessGateCount < contract.minReadinessGates) {
    failures.push(
      `readiness gates ${telemetry.readinessGateCount} < ${contract.minReadinessGates}`,
    )
  }
  if (telemetry.initialCellCount < contract.minInitialCells) {
    failures.push(
      `initial cells ${telemetry.initialCellCount} < ${contract.minInitialCells}`,
    )
  }
  if (telemetry.totalCellCount < telemetry.activeCellCount) {
    failures.push(
      `total cells ${telemetry.totalCellCount} < active cells ${telemetry.activeCellCount}`,
    )
  }
  if (telemetry.activeActorCount < telemetry.residentActorCount) {
    failures.push(
      `active actors ${telemetry.activeActorCount} < resident actors ${telemetry.residentActorCount}`,
    )
  }
  if (telemetry.activeRenderableActorCount < minRequiredRenderableActors) {
    failures.push(
      `active renderable actors ${telemetry.activeRenderableActorCount} < ${minRequiredRenderableActors}`,
    )
  }
  if (!Array.isArray(telemetry.activeCellKeys)) {
    failures.push('active cell keys are not an array')
  } else if (telemetry.activeCellKeys.length !== telemetry.activeCellCount) {
    failures.push(
      `active cell keys ${telemetry.activeCellKeys.length} !== active cell count ${telemetry.activeCellCount}`,
    )
  }

  if (failures.length > 0) {
    throw new Error(
      `${levelId} visual smoke streaming telemetry failed: ${failures.join('; ')}`,
    )
  }
}

async function captureCanvasScreenshot(page, levelId) {
  const canvas = page.locator('canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 30000 })
  const buffer = await canvas.screenshot({ animations: 'disabled' })

  if (writeArtifacts) {
    const artifactPath = resolve(artifactDir, `${levelId}.png`)
    mkdirSync(dirname(artifactPath), { recursive: true })
    writeFileSync(artifactPath, buffer)
  }

  return buffer
}

async function runLevel(browser, levelId) {
  const bookmark = getCameraBookmark(levelId)
  const page = await browser.newPage({ viewport: bookmark.viewport })
  let messages = []
  const consoleMessages = []

  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  page.on('console', msg => {
    const type = msg.type()
    consoleMessages.push(`[${type}] ${msg.text()}`)
    if (type === 'warning' || type === 'error') {
      const text = msg.text()
      if (!shouldIgnoreConsoleMessage(text)) messages.push(`[${type}] ${text}`)
    }
  })

  page.on('pageerror', error => {
    messages.push(`[pageerror] ${error.message}`)
  })

  page.on('requestfailed', request => {
    const url = request.url()
    const errorText = request.failure()?.errorText || 'unknown error'
    if (!shouldIgnoreRequestFailure(url, errorText)) {
      messages.push(
        `[requestfailed] ${request.method()} ${url} :: ${errorText}`,
      )
    }
  })

  async function loadAndCapture() {
    const response = await page.goto(buildLevelUrl(levelId, bookmark), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    if (!response || !response.ok()) {
      messages.push(
        `[navigation] ${levelId} returned ${response?.status?.() ?? 'no response'}`,
      )
    }

    await page.mouse.click(24, 24)
    await waitForPlayableLevel(page, levelId, {
      consoleMessages,
      diagnosticsTimeoutMs: 10000,
      currentLevelTimeoutMs: 10000,
      gameplayTimeoutMs: 60000,
    })
    await assertRequiredRenderActors(page, levelId)
    await assertRuntimeRenderLifecycle(page, levelId)
    await assertRenderedActors(page, levelId)
    await assertStreamingTelemetry(page, levelId)
    await page.waitForTimeout(bookmark.settleMs ?? 2000)

    const screenshot = await captureCanvasScreenshot(page, levelId)
    const metrics = analyzeScreenshot(screenshot)
    assertVisualMetrics(levelId, metrics)
    assertVisualBaseline(levelId, metrics, bookmark)
    return metrics
  }

  try {
    let metrics = await loadAndCapture()
    if (messages.some(message => isTransientConsoleMessage(message))) {
      messages = []
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)
      metrics = await loadAndCapture()
    }
    if (messages.length > 0) {
      throw new Error(messages.join('\n  '))
    }
    console.log(
      [
        `[visual-smoke] ${levelId}`,
        `${metrics.width}x${metrics.height}`,
        `colors=${metrics.uniqueColorBuckets}`,
        `lumaStdDev=${metrics.lumaStdDev}`,
        `light=${metrics.lightPixelRatio.toFixed(3)}`,
        `dark=${metrics.darkPixelRatio.toFixed(3)}`,
        `edge=${metrics.edgeScore}`,
      ].join('  '),
    )
  } finally {
    await page.close()
  }
}

if (requestedLevels.length === 0) {
  throw new Error(`No visual smoke levels matched --level=${levelFilter}`)
}

const browser = await launchBrowser(browserName)
const failures = []

for (const levelId of requestedLevels) {
  try {
    await runLevel(browser, levelId)
  } catch (error) {
    failures.push({
      levelId,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

await browser.close()

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[visual-smoke] ${failure.levelId} failed`)
    console.error(`  ${failure.message}`)
  }
  process.exit(1)
}

console.log(
  `[visual-smoke] ${browserName}: ${requestedLevels.join(', ')} passed canvas screenshot checks`,
)
writeVisualBaselines()
if (updateBaselines) {
  console.log(`[visual-smoke] updated visual baselines at ${baselinePath}`)
}
