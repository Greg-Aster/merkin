import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

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

export function formatBytes(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}

function normalizePublicPath(path) {
  return path.replace(/^\//, '')
}

function getSceneFiles(sceneDir) {
  return readdirSync(sceneDir)
    .filter(file => file.endsWith('.scene.json'))
    .sort()
}

function getNonRuntimeSceneJsonFiles(sceneDir) {
  return readdirSync(sceneDir)
    .filter(file => file.endsWith('.json') && !file.endsWith('.scene.json'))
    .sort()
}

function isGeometryNode(node) {
  return ['asset', 'primitive', 'prefab'].includes(node.kind)
}

export function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function getAssetUrl(node) {
  return typeof node.asset?.url === 'string' ? node.asset.url : null
}

function resolvePublicAssetPath(publicDir, url) {
  return join(publicDir, normalizePublicPath(url))
}

function auditScene({ file, sceneDir, publicDir }) {
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
    const fullPath = resolvePublicAssetPath(publicDir, url)
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

function validateSceneReport(report) {
  const failures = []

  if (!report.hasValidSpawn) {
    failures.push(
      `${report.file}: level must define settings.level.spawn.position as a finite Vec3`,
    )
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

  return failures
}

export function summarizeSceneReports(reports) {
  return reports.reduce(
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
}

export function auditSceneArchitecture({ sceneDir, publicDir }) {
  const reports = getSceneFiles(sceneDir).map(file =>
    auditScene({ file, sceneDir, publicDir }),
  )
  const nonRuntimeSceneJsonFiles = getNonRuntimeSceneJsonFiles(sceneDir)
  const failures = nonRuntimeSceneJsonFiles.map(
    file =>
      `${file}: editor/scenes must contain production *.scene.json files only; move backups to authoring/scene-backups`,
  )

  for (const report of reports) {
    failures.push(...validateSceneReport(report))
  }

  return {
    failures,
    nonRuntimeSceneJsonFiles,
    reports,
    totals: summarizeSceneReports(reports),
  }
}
