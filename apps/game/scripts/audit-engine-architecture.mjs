import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const sceneDir = join(process.cwd(), 'src/threlte/editor/scenes')
const terrainDir = join(process.cwd(), '../megameal/public/terrain')
const publicDir = join(process.cwd(), '../megameal/public')
const bakedTerrainManifests = [
  'observatory-environment.manifest.json',
  'solitude.manifest.json',
  'sci-fi-room.manifest.json',
  'yggdrasil.manifest.json',
]
const terrainManifestFiles = readdirSync(terrainDir)
  .filter(file => file.endsWith('.manifest.json'))
  .sort()
const forbiddenLegacyStyleFiles = [
  'src/threlte/core/StyleManager.ts',
  'src/threlte/ui/StyleControls.svelte',
  'src/threlte/styles/GhibliStyleSystem.svelte',
  'src/threlte/styles/GhibliStyleSystem (legacy).svelte',
  'src/threlte/styles/RenderStyleSystem.svelte',
]
const forbiddenDuplicateInteractionFiles = [
  'src/threlte/systems/Interaction.svelte',
]
const allowedDefaultCameraFiles = new Set([
  'src/threlte/features/player/Player.svelte',
  'src/threlte/editor/EditorViewportControls.svelte',
])
const terrainTriangleBudget = 50_000
const runtimeAssetFileBudgetBytes = 40 * 1024 * 1024
const sceneRuntimeAssetBudgetBytes = 160 * 1024 * 1024
const colliderMagic = 0x4d4d5443
const colliderVersion = 1
const collisionIntents = new Set([
  'none',
  'walkable',
  'blocker',
  'trigger',
  'detailMesh',
])
const collisionChannels = new Set([
  'worldStatic',
  'worldDynamic',
  'player',
  'trigger',
  'detail',
])
const visualOnlyActorIds = new Set([
  'solitude-ground-plateau',
  'solitude-ground-dais',
  'yggdrasil-mound',
  'yggdrasil-bifrost-ribbon-merged',
])

function getSceneFiles() {
  return readdirSync(sceneDir)
    .filter(file => file.endsWith('.scene.json'))
    .sort()
}

function getSourceFiles(dir, prefix = '') {
  const files = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const relativePath = prefix ? `${prefix}/${entry}` : entry
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...getSourceFiles(fullPath, relativePath))
    } else if (/\.(svelte|ts|js|mjs)$/.test(entry)) {
      files.push(relativePath)
    }
  }
  return files
}

function getNonRuntimeSceneJsonFiles() {
  return readdirSync(sceneDir)
    .filter(file => file.endsWith('.json') && !file.endsWith('.scene.json'))
    .sort()
}

function isGeometryNode(node) {
  return ['asset', 'primitive', 'prefab'].includes(node.kind)
}

function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function getAssetUrl(node) {
  return typeof node.asset?.url === 'string' ? node.asset.url : null
}

function resolvePublicAssetPath(url) {
  return join(publicDir, normalizePublicPath(url))
}

function formatBytes(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}

function auditScene(file) {
  const fullPath = join(sceneDir, file)
  const source = readFileSync(fullPath, 'utf8')
  const hasBom = source.startsWith('\uFEFF')
  const scene = JSON.parse(source.replace(/^\uFEFF/, ''))
  const nodes = Array.isArray(scene.nodes) ? scene.nodes : []
  const spawnPosition = scene.settings?.level?.spawn?.position
  const geometryNodes = nodes.filter(isGeometryNode)
  const explicitCollision = geometryNodes.filter(node => node.collision)
  const missingCollisionIntent = explicitCollision.filter(
    node => !collisionIntents.has(node.collision?.intent),
  )
  const missingCollisionChannel = explicitCollision.filter(
    node => !collisionChannels.has(node.collision?.channel),
  )
  const invalidCollisionChannel = explicitCollision.filter(node => {
    const intent = node.collision?.intent
    const channel = node.collision?.channel
    if (!collisionChannels.has(channel)) return false
    if (intent === 'trigger') return channel !== 'trigger'
    if (intent === 'detailMesh') return channel !== 'detail'
    if (intent === 'none') return false
    return channel === 'trigger' || channel === 'detail'
  })
  const disabledCollision = explicitCollision.filter(
    node => node.collision?.enabled === false,
  )
  const detailMeshWithoutBudget = explicitCollision.filter(
    node =>
      node.collision?.enabled !== false &&
      node.collision?.intent === 'detailMesh' &&
      !Number.isFinite(node.collision?.triangleBudget),
  )
  const explicitTrimesh = explicitCollision.filter(
    node =>
      node.collision?.enabled !== false && node.collision?.shape === 'trimesh',
  )
  const missingDefaultCollision = geometryNodes.filter(
    node =>
      node.visible !== false &&
      !node.gameplay &&
      !node.collision &&
      !visualOnlyActorIds.has(node.id),
  )
  const assetUrls = [...new Set(nodes.map(getAssetUrl).filter(Boolean))].sort()
  const assetFiles = assetUrls.map(url => {
    const fullPath = resolvePublicAssetPath(url)
    const exists = existsSync(fullPath)
    const sizeBytes = exists ? statSync(fullPath).size : 0

    return {
      url,
      exists,
      sizeBytes,
    }
  })
  const missingAssetFiles = assetFiles.filter(asset => !asset.exists)
  const oversizedAssetFiles = assetFiles.filter(
    asset => asset.sizeBytes > runtimeAssetFileBudgetBytes,
  )
  const totalRuntimeAssetBytes = assetFiles.reduce(
    (sum, asset) => sum + asset.sizeBytes,
    0,
  )
  const largestAsset = assetFiles.reduce(
    (largest, asset) =>
      !largest || asset.sizeBytes > largest.sizeBytes ? asset : largest,
    null,
  )

  return {
    file,
    sizeKb: Math.round(statSync(fullPath).size / 1024),
    nodes: nodes.length,
    geometryNodes: geometryNodes.length,
    explicitCollision: explicitCollision.length,
    missingCollisionIntent: missingCollisionIntent.length,
    missingCollisionChannel: missingCollisionChannel.length,
    invalidCollisionChannel: invalidCollisionChannel.length,
    detailMeshWithoutBudget: detailMeshWithoutBudget.length,
    disabledCollision: disabledCollision.length,
    explicitTrimesh: explicitTrimesh.length,
    missingDefaultCollision: missingDefaultCollision.length,
    assetFiles: assetFiles.length,
    totalRuntimeAssetBytes,
    largestAsset,
    hasBom,
    spawnPosition,
    hasValidSpawn: isFiniteVec3(spawnPosition),
    explicitTrimeshIds: explicitTrimesh.map(node => node.id),
    missingCollisionIntentIds: missingCollisionIntent.map(node => node.id),
    missingCollisionChannelIds: missingCollisionChannel.map(node => node.id),
    invalidCollisionChannelIds: invalidCollisionChannel.map(node => node.id),
    detailMeshWithoutBudgetIds: detailMeshWithoutBudget.map(node => node.id),
    missingDefaultCollisionIds: missingDefaultCollision.map(node => node.id),
    missingAssetFileUrls: missingAssetFiles.map(asset => asset.url),
    oversizedAssetFiles,
  }
}

const reports = getSceneFiles().map(auditScene)
const nonRuntimeSceneJsonFiles = getNonRuntimeSceneJsonFiles()
const failures = nonRuntimeSceneJsonFiles.map(
  file =>
    `${file}: editor/scenes must contain production *.scene.json files only; move backups to src/threlte/editor/scene-backups`,
)
for (const file of forbiddenLegacyStyleFiles) {
  if (existsSync(join(process.cwd(), file))) {
    failures.push(
      `${file}: legacy scene-traversal style system must stay removed; use runtimeVisualStyleStore and level style profiles`,
    )
  }
}
for (const file of forbiddenDuplicateInteractionFiles) {
  if (existsSync(join(process.cwd(), file))) {
    failures.push(
      `${file}: duplicate interaction system must stay removed; use systems/InteractionSystem.svelte`,
    )
  }
}
for (const file of getSourceFiles(join(process.cwd(), 'src/threlte'), 'src/threlte')) {
  const source = readFileSync(join(process.cwd(), file), 'utf8')
  if (source.includes('makeDefault') && !allowedDefaultCameraFiles.has(file)) {
    failures.push(
      `${file}: default scene cameras are only allowed in Player.svelte for gameplay and EditorViewportControls.svelte for editor orbit mode`,
    )
  }
}

function stripBom(source) {
  return source.replace(/^\uFEFF/, '')
}

function normalizePublicPath(path) {
  return path.replace(/^\//, '')
}

function readJsonFile(fullPath) {
  return JSON.parse(stripBom(readFileSync(fullPath, 'utf8')))
}

function readColliderHeader(fullPath) {
  const buffer = readFileSync(fullPath)
  if (buffer.byteLength < 32) {
    throw new Error(`Collider artifact too small: ${buffer.byteLength} bytes`)
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const magic = view.getUint32(0, true)
  const version = view.getUint32(4, true)
  if (magic !== colliderMagic) {
    throw new Error(`Invalid collider magic: 0x${magic.toString(16)}`)
  }
  if (version !== colliderVersion) {
    throw new Error(`Unsupported collider version: ${version}`)
  }

  const header = {
    vertexCount: view.getUint32(8, true),
    indexCount: view.getUint32(12, true),
    triangleCount: view.getUint32(16, true),
    sourceResolution: view.getUint32(20, true),
    colliderResolution: view.getUint32(24, true),
    sampleStep: view.getUint32(28, true),
  }
  const expectedBytes =
    32 +
    header.vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT +
    header.indexCount * Uint32Array.BYTES_PER_ELEMENT

  if (buffer.byteLength !== expectedBytes) {
    throw new Error(
      `Collider byte mismatch: expected ${expectedBytes}, got ${buffer.byteLength}`,
    )
  }

  return header
}

function assertEqual(label, expected, actual, manifestFile) {
  if (expected !== actual) {
    failures.push(
      `${manifestFile}: ${label} mismatch expected=${expected} actual=${actual}`,
    )
  }
}

function auditTerrainManifest(file) {
  const fullPath = join(terrainDir, file)
  const source = readFileSync(fullPath, 'utf8')
  const hasBom = source.startsWith('\uFEFF')
  const manifest = JSON.parse(stripBom(source))
  const collision = manifest.collision?.terrain
  const report = {
    file,
    physicsType: manifest.physics?.type ?? 'missing',
    collisionType: collision?.type ?? 'missing',
    vertexCount: collision?.vertexCount ?? 0,
    triangleCount: collision?.triangleCount ?? 0,
    colliderResolution: collision?.colliderResolution ?? 0,
    sampleStep: collision?.sampleStep ?? 0,
    artifact: collision?.url ?? 'missing',
    metadata: collision?.metadataUrl ?? 'missing',
    hasBom,
  }

  if (hasBom) {
    failures.push(`${file}: manifest has a UTF-8 BOM`)
  }
  if (manifest.physics?.type !== 'baked-terrain-mesh') {
    failures.push(`${file}: physics.type must be baked-terrain-mesh`)
  }
  if (manifest.physics?.trimesh) {
    failures.push(`${file}: legacy physics.trimesh must be removed`)
  }
  if (collision?.type !== 'baked-terrain-mesh') {
    failures.push(`${file}: collision.terrain.type must be baked-terrain-mesh`)
  }
  if (collision?.authoredException !== true) {
    failures.push(
      `${file}: baked terrain collision must set authoredException=true`,
    )
  }
  if (!collision?.url || !collision?.metadataUrl) {
    failures.push(`${file}: baked collider url and metadataUrl are required`)
    return report
  }

  const artifactPath = join(
    process.cwd(),
    '../megameal/public',
    normalizePublicPath(collision.url),
  )
  const metadataPath = join(
    process.cwd(),
    '../megameal/public',
    normalizePublicPath(collision.metadataUrl),
  )

  if (!existsSync(artifactPath)) {
    failures.push(`${file}: missing collider artifact ${collision.url}`)
    return report
  }
  if (!existsSync(metadataPath)) {
    failures.push(`${file}: missing collider metadata ${collision.metadataUrl}`)
    return report
  }

  try {
    const metadata = readJsonFile(metadataPath)
    const header = readColliderHeader(artifactPath)

    assertEqual('metadata type', 'baked-terrain-mesh', metadata.type, file)
    assertEqual(
      'vertexCount manifest/header',
      collision.vertexCount,
      header.vertexCount,
      file,
    )
    assertEqual(
      'triangleCount manifest/header',
      collision.triangleCount,
      header.triangleCount,
      file,
    )
    assertEqual(
      'colliderResolution manifest/header',
      collision.colliderResolution,
      header.colliderResolution,
      file,
    )
    assertEqual(
      'sampleStep manifest/header',
      collision.sampleStep,
      header.sampleStep,
      file,
    )
    assertEqual(
      'vertexCount metadata/header',
      metadata.vertexCount,
      header.vertexCount,
      file,
    )
    assertEqual(
      'triangleCount metadata/header',
      metadata.triangleCount,
      header.triangleCount,
      file,
    )

    if (header.triangleCount > terrainTriangleBudget) {
      failures.push(
        `${file}: terrain collider exceeds triangle budget ${header.triangleCount}/${terrainTriangleBudget}`,
      )
    }
    if (header.indexCount !== header.triangleCount * 3) {
      failures.push(`${file}: collider index count is not triangleCount * 3`)
    }
  } catch (error) {
    failures.push(
      `${file}: failed to validate baked collider artifact: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  return report
}

const terrainReports = bakedTerrainManifests.map(auditTerrainManifest)
const legacyTerrainManifestReports = terrainManifestFiles.map(file => {
  const fullPath = join(terrainDir, file)
  const source = readFileSync(fullPath, 'utf8')
  const manifest = JSON.parse(stripBom(source))
  const hasLegacyTrimesh = Boolean(manifest.physics?.trimesh)
  const physicsType = manifest.physics?.type ?? 'missing'

  if (hasLegacyTrimesh) {
    failures.push(`${file}: legacy physics.trimesh must be removed`)
  }
  if (physicsType === 'trimesh') {
    failures.push(`${file}: physics.type must not use legacy trimesh`)
  }

  return {
    file,
    physicsType,
    hasLegacyTrimesh,
  }
})

console.log('Engine architecture scene audit')
console.log('================================')

if (nonRuntimeSceneJsonFiles.length > 0) {
  console.log(
    `Non-runtime scene JSON files: ${nonRuntimeSceneJsonFiles.join(', ')}`,
  )
  console.log('')
}

for (const report of reports) {
  console.log(
    [
      report.file,
      `${report.sizeKb}KB`,
      `nodes=${report.nodes}`,
      `geometry=${report.geometryNodes}`,
      `explicitCollision=${report.explicitCollision}`,
      `missingIntent=${report.missingCollisionIntent}`,
      `missingChannel=${report.missingCollisionChannel}`,
      `invalidChannel=${report.invalidCollisionChannel}`,
      `detailMeshWithoutBudget=${report.detailMeshWithoutBudget}`,
      `disabledCollision=${report.disabledCollision}`,
      `explicitTrimesh=${report.explicitTrimesh}`,
      `missingDefaultCollision=${report.missingDefaultCollision}`,
      `assetFiles=${report.assetFiles}`,
      `assetSize=${formatBytes(report.totalRuntimeAssetBytes)}`,
      `spawn=${report.hasValidSpawn ? `[${report.spawnPosition.join(',')}]` : 'invalid'}`,
      `bom=${report.hasBom ? 'yes' : 'no'}`,
    ].join('  '),
  )

  if (!report.hasValidSpawn) {
    failures.push(
      `${report.file}: level must define settings.level.spawn.position as a finite Vec3`,
    )
  }

  if (report.explicitTrimeshIds.length > 0) {
    console.log(`  explicit trimesh: ${report.explicitTrimeshIds.join(', ')}`)
  }

  if (report.missingCollisionIntentIds.length > 0) {
    failures.push(
      `${report.file}: collision entries must declare intent: ${report.missingCollisionIntentIds.join(', ')}`,
    )
  }
  if (report.missingCollisionChannelIds.length > 0) {
    failures.push(
      `${report.file}: collision entries must declare channel: ${report.missingCollisionChannelIds.join(', ')}`,
    )
  }
  if (report.invalidCollisionChannelIds.length > 0) {
    failures.push(
      `${report.file}: collision channel does not match intent: ${report.invalidCollisionChannelIds.join(', ')}`,
    )
  }
  if (report.detailMeshWithoutBudgetIds.length > 0) {
    failures.push(
      `${report.file}: detailMesh collision requires triangleBudget: ${report.detailMeshWithoutBudgetIds.join(', ')}`,
    )
  }
  if (report.hasBom) {
    failures.push(`${report.file}: scene file has a UTF-8 BOM`)
  }
  if (report.missingDefaultCollisionIds.length > 0) {
    failures.push(
      `${report.file}: visible geometry must explicitly author collision or disable it: ${report.missingDefaultCollisionIds.join(', ')}`,
    )
  }
  if (report.missingAssetFileUrls.length > 0) {
    failures.push(
      `${report.file}: asset URLs must resolve to public files: ${report.missingAssetFileUrls.join(', ')}`,
    )
  }
  for (const asset of report.oversizedAssetFiles) {
    failures.push(
      `${report.file}: runtime asset exceeds ${formatBytes(runtimeAssetFileBudgetBytes)} budget: ${asset.url} (${formatBytes(asset.sizeBytes)})`,
    )
  }
  if (report.totalRuntimeAssetBytes > sceneRuntimeAssetBudgetBytes) {
    failures.push(
      `${report.file}: scene runtime assets exceed ${formatBytes(sceneRuntimeAssetBudgetBytes)} budget: ${formatBytes(report.totalRuntimeAssetBytes)}`,
    )
  }
  if (report.largestAsset && report.largestAsset.sizeBytes > 0) {
    console.log(
      `  largest asset: ${report.largestAsset.url} (${formatBytes(report.largestAsset.sizeBytes)})`,
    )
  }
}

const totals = reports.reduce(
  (sum, report) => ({
    nodes: sum.nodes + report.nodes,
    geometryNodes: sum.geometryNodes + report.geometryNodes,
    explicitCollision: sum.explicitCollision + report.explicitCollision,
    missingCollisionIntent:
      sum.missingCollisionIntent + report.missingCollisionIntent,
    missingCollisionChannel:
      sum.missingCollisionChannel + report.missingCollisionChannel,
    invalidCollisionChannel:
      sum.invalidCollisionChannel + report.invalidCollisionChannel,
    detailMeshWithoutBudget:
      sum.detailMeshWithoutBudget + report.detailMeshWithoutBudget,
    disabledCollision: sum.disabledCollision + report.disabledCollision,
    explicitTrimesh: sum.explicitTrimesh + report.explicitTrimesh,
    missingDefaultCollision:
      sum.missingDefaultCollision + report.missingDefaultCollision,
    assetFiles: sum.assetFiles + report.assetFiles,
    totalRuntimeAssetBytes:
      sum.totalRuntimeAssetBytes + report.totalRuntimeAssetBytes,
    bomFiles: sum.bomFiles + (report.hasBom ? 1 : 0),
  }),
  {
    nodes: 0,
    geometryNodes: 0,
    explicitCollision: 0,
    missingCollisionIntent: 0,
    missingCollisionChannel: 0,
    invalidCollisionChannel: 0,
    detailMeshWithoutBudget: 0,
    disabledCollision: 0,
    explicitTrimesh: 0,
    missingDefaultCollision: 0,
    assetFiles: 0,
    totalRuntimeAssetBytes: 0,
    bomFiles: 0,
  },
)

console.log('--------------------------------')
console.log(
  [
    'TOTAL',
    `nodes=${totals.nodes}`,
    `geometry=${totals.geometryNodes}`,
    `explicitCollision=${totals.explicitCollision}`,
    `missingIntent=${totals.missingCollisionIntent}`,
    `missingChannel=${totals.missingCollisionChannel}`,
    `invalidChannel=${totals.invalidCollisionChannel}`,
    `detailMeshWithoutBudget=${totals.detailMeshWithoutBudget}`,
    `disabledCollision=${totals.disabledCollision}`,
    `explicitTrimesh=${totals.explicitTrimesh}`,
    `missingDefaultCollision=${totals.missingDefaultCollision}`,
    `assetFiles=${totals.assetFiles}`,
    `assetSize=${formatBytes(totals.totalRuntimeAssetBytes)}`,
    `bomFiles=${totals.bomFiles}`,
  ].join('  '),
)

console.log('')
console.log('Baked terrain collision audit')
console.log('=============================')

for (const report of terrainReports) {
  console.log(
    [
      report.file,
      `physics=${report.physicsType}`,
      `collision=${report.collisionType}`,
      `vertices=${report.vertexCount}`,
      `triangles=${report.triangleCount}`,
      `resolution=${report.colliderResolution}`,
      `sampleStep=${report.sampleStep}`,
    ].join('  '),
  )
}

console.log('')
console.log('Terrain manifest legacy audit')
console.log('=============================')

for (const report of legacyTerrainManifestReports) {
  console.log(
    [
      report.file,
      `physics=${report.physicsType}`,
      `legacyTrimesh=${report.hasLegacyTrimesh ? 'yes' : 'no'}`,
    ].join('  '),
  )
}

if (failures.length > 0) {
  console.log('')
  console.error('Engine architecture audit failed')
  console.error('================================')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exitCode = 1
}
