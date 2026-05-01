import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { readDeployedSceneLevels } from './lib/levelRegistry.mjs'

const sceneDir = join(process.cwd(), 'src/threlte/editor/scenes')
const terrainDir = join(process.cwd(), '../megameal/public/terrain')
const gameEditorToolsBridgePath = join(
  process.cwd(),
  'scripts/editor-tools/server.cjs',
)
const runtimeSceneDir = join(
  process.cwd(),
  '../megameal/public/generated/runtime-game-assets/scenes',
)
const worldPartitionDir = join(
  process.cwd(),
  '../megameal/public/runtime-world-partitions',
)
const publicDir = join(process.cwd(), '../megameal/public')
const bakedTerrainManifests = [
  'observatory-environment.manifest.json',
  'solitude.manifest.json',
  'sci-fi-room.manifest.json',
  'yggdrasil.manifest.json',
]
const chunkedTerrainRequiredManifests = new Set([
  'solitude.manifest.json',
  'yggdrasil.manifest.json',
])
const requiredWorldPartitionLevels = ['solitude', 'yggdrasil']
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
const retiredToolsEndpoints = [
  '/api/project-file',
  '/api/generate-heightmap',
  '/api/analyze-glb',
  '/api/process-level',
  '/api/generate-level',
  '/api/unified-pipeline',
  '/api/levels/scan',
  '/api/pure-level-stars',
  '/api/starmap/data',
  '/api/starmap/save',
  '/api/save-level-config',
  '/api/update-manifest',
  '/api/convert-cubemap',
  '/api/get-level-manifests',
]
const allowedDefaultCameraFiles = new Set([
  'src/threlte/features/player/Player.svelte',
  'src/threlte/editor/EditorViewportControls.svelte',
])
const terrainTriangleBudget = 50_000
const runtimeAssetFileBudgetBytes = 40 * 1024 * 1024
const sceneRuntimeAssetBudgetBytes = 160 * 1024 * 1024
const visualBudgetDefaults = {
  maxPrimitiveActors: 80,
  maxNeverCullActors: 4,
  maxGameplayFireflies: 40,
}
const visualBudgetByLevel = {
  observatory: {
    maxPrimitiveActors: 8,
    maxGameplayFireflies: 0,
  },
  solitude: {
    maxPrimitiveActors: 16,
    maxGameplayFireflies: 16,
  },
  yggdrasil: {
    maxPrimitiveActors: 80,
    maxNeverCullActors: 4,
    maxGameplayFireflies: 40,
  },
}
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
  const primitiveNodes = nodes.filter(node => node.kind === 'primitive')
  const neverCullNodes = nodes.filter(
    node => node.renderPolicy?.cullingPolicy === 'never',
  )
  const gameplayFireflies = nodes.filter(
    node => node.gameplay?.type === 'firefly',
  )
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
    primitiveNodes: primitiveNodes.length,
    neverCullNodes: neverCullNodes.length,
    gameplayFireflies: gameplayFireflies.length,
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
for (const file of getSourceFiles(
  join(process.cwd(), 'src/threlte'),
  'src/threlte',
)) {
  const source = readFileSync(join(process.cwd(), file), 'utf8')
  if (source.includes('makeDefault') && !allowedDefaultCameraFiles.has(file)) {
    failures.push(
      `${file}: default scene cameras are only allowed in Player.svelte for gameplay and EditorViewportControls.svelte for editor orbit mode`,
    )
  }

  for (const endpoint of retiredToolsEndpoints) {
    if (source.includes(endpoint)) {
      failures.push(
        `${file}: retired tools endpoint ${endpoint} must not be called by the current editor/runtime`,
      )
    }
  }
}

for (const routeSourcePath of [gameEditorToolsBridgePath]) {
  if (existsSync(routeSourcePath)) {
    const editorApiSource = readFileSync(routeSourcePath, 'utf8')
    for (const endpoint of retiredToolsEndpoints) {
      if (editorApiSource.includes(`pathname === '${endpoint}'`)) {
        failures.push(
          `${routeSourcePath}: retired route handler ${endpoint} must stay deleted`,
        )
      }
    }
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

function isValidMaterialFactor(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1
}

function validateTerrainChunkMaterial(file, manifest) {
  if (!manifest.assets?.chunksPath) return

  const material = manifest.visualChunks?.material
  if (!material) {
    failures.push(`${file}: terrain visual chunks require visualChunks.material`)
    return
  }

  if (typeof material.name !== 'string' || !material.name.trim()) {
    failures.push(`${file}: visualChunks.material.name is required`)
  }
  if (
    !Array.isArray(material.baseColorFactor) ||
    material.baseColorFactor.length !== 4 ||
    !material.baseColorFactor.every(isValidMaterialFactor)
  ) {
    failures.push(
      `${file}: visualChunks.material.baseColorFactor must be four values from 0 to 1`,
    )
  }
  if (!isValidMaterialFactor(material.roughnessFactor)) {
    failures.push(
      `${file}: visualChunks.material.roughnessFactor must be from 0 to 1`,
    )
  }
  if (!isValidMaterialFactor(material.metallicFactor)) {
    failures.push(
      `${file}: visualChunks.material.metallicFactor must be from 0 to 1`,
    )
  }
}

function validateTerrainChunkActivation(file, manifest) {
  if (!manifest.assets?.chunksPath) return

  const activation = manifest.visualChunks?.activation
  if (!activation) {
    failures.push(`${file}: terrain visual chunks require visualChunks.activation`)
    return
  }

  const maxActiveChunks = activation.maxActiveChunks
  const tierLimits = activation.maxActiveChunksByTier ?? {}
  const hasGlobalLimit = Number.isInteger(maxActiveChunks) && maxActiveChunks > 0
  const hasTierLimit = Object.values(tierLimits).some(
    value => Number.isInteger(value) && value > 0,
  )

  if (!hasGlobalLimit && !hasTierLimit) {
    failures.push(
      `${file}: visualChunks.activation requires a positive maxActiveChunks or maxActiveChunksByTier value`,
    )
  }

  for (const [tier, value] of Object.entries(tierLimits)) {
    if (!Number.isInteger(value) || value <= 0) {
      failures.push(
        `${file}: visualChunks.activation.maxActiveChunksByTier.${tier} must be a positive integer`,
      )
    }
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
    chunksPath: manifest.assets?.chunksPath ?? 'missing',
    chunkFiles: 0,
    expectedChunkFiles: manifest.visualChunks?.chunkCount ?? 0,
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
  if (
    chunkedTerrainRequiredManifests.has(file) &&
    !manifest.assets?.chunksPath
  ) {
    failures.push(`${file}: terrain visual chunks are required`)
  }
  if (manifest.assets?.chunksPath) {
    validateTerrainChunkMaterial(file, manifest)
    validateTerrainChunkActivation(file, manifest)

    const chunkDir = join(
      publicDir,
      normalizePublicPath(manifest.assets.chunksPath),
    )
    if (!existsSync(chunkDir)) {
      failures.push(
        `${file}: missing terrain chunk directory ${manifest.assets.chunksPath}`,
      )
    } else {
      report.chunkFiles = readdirSync(chunkDir).filter(entry =>
        /^chunk_\d+_\d+_LOD\d+\.glb$/i.test(entry),
      ).length
      if (
        report.expectedChunkFiles > 0 &&
        report.chunkFiles !== report.expectedChunkFiles
      ) {
        failures.push(
          `${file}: terrain chunk count mismatch expected=${report.expectedChunkFiles} actual=${report.chunkFiles}`,
        )
      }
    }
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
const worldPartitionReports = requiredWorldPartitionLevels.map(levelId => {
  const file = `${levelId}.partition.json`
  const fullPath = join(worldPartitionDir, file)
  const report = {
    file,
    cells: 0,
    residentActors: 0,
    streamableActors: 0,
    maxActorsPerCell: 0,
  }

  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing runtime world partition manifest`)
    return report
  }

  const partition = readJsonFile(fullPath)
  report.cells = partition.cells?.length ?? 0
  report.residentActors = partition.residentActorIds?.length ?? 0
  report.streamableActors = partition.streamableActorIds?.length ?? 0
  report.maxActorsPerCell = partition.budgets?.maxActorsPerCell ?? 0

  if (partition.version !== 1) {
    failures.push(`${file}: unsupported partition version ${partition.version}`)
  }
  if (partition.levelId !== levelId) {
    failures.push(`${file}: levelId mismatch ${partition.levelId}`)
  }
  if (!Array.isArray(partition.cells)) {
    failures.push(`${file}: cells must be an array`)
  }
  if (report.streamableActors < 1) {
    failures.push(`${file}: expected at least one streamable actor`)
  }

  return report
})
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
const runtimeSceneReports = readDeployedSceneLevels({
  appRoot: process.cwd(),
}).map(level => {
  const file = `${level.id}.runtime-scene.json`
  const fullPath = join(runtimeSceneDir, file)
  const report = {
    file,
    levelId: level.id,
    exists: existsSync(fullPath),
    actorCount: 0,
    requiredRenderActorCount: 0,
    requiredAssetCount: 0,
    runtimeAssetCount: 0,
    buildErrors: 0,
  }

  if (!report.exists) {
    failures.push(`${file}: missing cooked runtime scene manifest`)
    return report
  }

  const manifest = readJsonFile(fullPath)
  const levelDefinition = manifest.levelDefinition
  const buildReport = manifest.buildReport

  if (manifest.schemaVersion !== 1) {
    failures.push(`${file}: unsupported runtime scene schemaVersion`)
  }
  if (manifest.levelId !== level.id) {
    failures.push(`${file}: levelId mismatch ${manifest.levelId}`)
  }
  if (!levelDefinition || levelDefinition.id !== level.id) {
    failures.push(`${file}: levelDefinition id mismatch`)
  }
  if (!isFiniteVec3(levelDefinition?.spawn?.player)) {
    failures.push(`${file}: levelDefinition spawn.player must be a finite Vec3`)
  }
  if (!Array.isArray(levelDefinition?.actors)) {
    failures.push(`${file}: levelDefinition actors must be an array`)
  }
  if (!buildReport || buildReport.levelId !== level.id) {
    failures.push(`${file}: buildReport levelId mismatch`)
  }

  report.actorCount = levelDefinition?.actors?.length ?? 0
  report.requiredRenderActorCount =
    buildReport?.requiredRenderActorIds?.length ?? 0
  report.requiredAssetCount = buildReport?.requiredAssetUrls?.length ?? 0
  report.runtimeAssetCount = buildReport?.runtimeAssetUrls?.length ?? 0
  report.buildErrors = buildReport?.errors?.length ?? 0

  if (report.buildErrors > 0) {
    failures.push(`${file}: cooked runtime scene has build errors`)
  }

  return report
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
      `primitives=${report.primitiveNodes}`,
      `neverCull=${report.neverCullNodes}`,
      `fireflies=${report.gameplayFireflies}`,
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
  const levelId = report.file.replace(/\.scene\.json$/, '')
  const visualBudget = {
    ...visualBudgetDefaults,
    ...(visualBudgetByLevel[levelId] ?? {}),
  }
  if (report.primitiveNodes > visualBudget.maxPrimitiveActors) {
    failures.push(
      `${report.file}: primitive render actors exceed visual budget ${report.primitiveNodes}/${visualBudget.maxPrimitiveActors}; bake repeated primitives into runtime assets or chunks`,
    )
  }
  if (report.neverCullNodes > visualBudget.maxNeverCullActors) {
    failures.push(
      `${report.file}: never-cull render actors exceed visual budget ${report.neverCullNodes}/${visualBudget.maxNeverCullActors}`,
    )
  }
  if (report.gameplayFireflies > visualBudget.maxGameplayFireflies) {
    failures.push(
      `${report.file}: firefly gameplay actors exceed visual budget ${report.gameplayFireflies}/${visualBudget.maxGameplayFireflies}; use chunked/pooled marker presentation`,
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
    primitiveNodes: sum.primitiveNodes + report.primitiveNodes,
    neverCullNodes: sum.neverCullNodes + report.neverCullNodes,
    gameplayFireflies: sum.gameplayFireflies + report.gameplayFireflies,
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
    primitiveNodes: 0,
    neverCullNodes: 0,
    gameplayFireflies: 0,
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
    `primitives=${totals.primitiveNodes}`,
    `neverCull=${totals.neverCullNodes}`,
    `fireflies=${totals.gameplayFireflies}`,
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
console.log('Cooked runtime scene audit')
console.log('==========================')

for (const report of runtimeSceneReports) {
  console.log(
    [
      report.file,
      `exists=${report.exists ? 'yes' : 'no'}`,
      `actors=${report.actorCount}`,
      `requiredRender=${report.requiredRenderActorCount}`,
      `requiredAssets=${report.requiredAssetCount}`,
      `runtimeAssets=${report.runtimeAssetCount}`,
      `buildErrors=${report.buildErrors}`,
    ].join('  '),
  )
}

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
      `chunks=${report.chunkFiles}`,
      `expectedChunks=${report.expectedChunkFiles}`,
    ].join('  '),
  )
}

console.log('')
console.log('World partition audit')
console.log('=====================')

for (const report of worldPartitionReports) {
  console.log(
    [
      report.file,
      `cells=${report.cells}`,
      `residentActors=${report.residentActors}`,
      `streamableActors=${report.streamableActors}`,
      `maxActorsPerCell=${report.maxActorsPerCell}`,
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
