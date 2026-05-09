import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { findDeprecatedSceneFields } from './deprecatedSceneFields.mjs'

const requiredGraphicsBudgetKeys = [
  'maxRuntimeAssetBytes',
  'maxRuntimeAssetFileBytes',
  'maxGeometryActors',
  'maxPrimitiveActors',
  'maxNeverCullActors',
  'maxGameplayFireflies',
  'maxExplicitColliders',
  'maxLightActors',
  'maxEstimatedDrawCalls',
  'maxAuthoredMaterialSlots',
  'maxEstimatedTriangles',
  'maxAuthoredTextureBytes',
]
const materialTextureKeys = [
  'mapUrl',
  'emissiveMapUrl',
  'metalnessMapUrl',
  'roughnessMapUrl',
  'normalMapUrl',
  'alphaMapUrl',
]
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

function isLightNode(node) {
  return node.kind === 'light' || !!node.light
}

function getGraphicsBudget(scene) {
  return scene.settings?.level?.graphicsBudget ?? null
}

function getMissingGraphicsBudgetKeys(graphicsBudget) {
  return requiredGraphicsBudgetKeys.filter(
    key => !Number.isFinite(graphicsBudget?.[key]),
  )
}

function getBudgetLimit(graphicsBudget, key) {
  const value = graphicsBudget?.[key]
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

function estimatePrimitiveTriangles(node) {
  const geometry = node.primitive?.geometry
  const args = Array.isArray(node.primitive?.args) ? node.primitive.args : []

  if (geometry === 'box') return 12
  if (geometry === 'plane') return 2
  if (geometry === 'sphere') {
    const widthSegments = Number.isFinite(args[1]) ? args[1] : 32
    const heightSegments = Number.isFinite(args[2]) ? args[2] : 16
    return Math.max(8, Math.round(widthSegments * heightSegments * 2))
  }
  if (geometry === 'cylinder') {
    const radialSegments = Number.isFinite(args[2]) ? args[2] : 32
    return Math.max(12, Math.round(radialSegments * 4))
  }
  if (geometry === 'torus') {
    const radialSegments = Number.isFinite(args[2]) ? args[2] : 8
    const tubularSegments = Number.isFinite(args[3]) ? args[3] : 32
    return Math.max(32, Math.round(radialSegments * tubularSegments * 2))
  }

  return 12
}

function getMaterialTextureUrls(nodes) {
  return [
    ...new Set(
      nodes.flatMap(node =>
        materialTextureKeys
          .map(key => node.material?.[key])
          .filter(value => typeof value === 'string' && value.length > 0),
      ),
    ),
  ].sort()
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
  const deprecatedFields = findDeprecatedSceneFields(scene)
  const graphicsBudget = getGraphicsBudget(scene)
  const missingGraphicsBudgetKeys = getMissingGraphicsBudgetKeys(graphicsBudget)
  const visualOnlyActorIds = new Set(
    Array.isArray(scene.settings?.level?.collision?.roles?.visualOnlyActorIds)
      ? scene.settings.level.collision.roles.visualOnlyActorIds
      : [],
  )
  const spawnPosition = scene.settings?.level?.spawn?.position
  const geometryNodes = nodes.filter(isGeometryNode)
  const primitiveNodes = nodes.filter(node => node.kind === 'primitive')
  const lightNodes = nodes.filter(isLightNode)
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
  const authoredMaterialSlots = geometryNodes.filter(
    node => node.material || node.primitive,
  )
  const estimatedTriangles = primitiveNodes.reduce(
    (sum, node) => sum + estimatePrimitiveTriangles(node),
    0,
  )
  const materialTextureUrls = getMaterialTextureUrls(nodes)
  const materialTextureFiles = materialTextureUrls.map(url => {
    const fullPath = resolvePublicAssetPath(publicDir, url)
    const exists = existsSync(fullPath)
    const sizeBytes = exists ? statSync(fullPath).size : 0

    return {
      url,
      exists,
      sizeBytes,
    }
  })
  const missingMaterialTextureFiles = materialTextureFiles.filter(
    texture => !texture.exists,
  )
  const authoredTextureBytes = materialTextureFiles.reduce(
    (sum, texture) => sum + texture.sizeBytes,
    0,
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
    asset =>
      asset.sizeBytes >
      getBudgetLimit(graphicsBudget, 'maxRuntimeAssetFileBytes'),
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
    graphicsBudget,
    missingGraphicsBudgetKeys,
    geometryNodes: geometryNodes.length,
    primitiveNodes: primitiveNodes.length,
    lightNodes: lightNodes.length,
    neverCullNodes: neverCullNodes.length,
    gameplayFireflies: gameplayFireflies.length,
    explicitCollision: explicitCollision.length,
    estimatedDrawCalls: geometryNodes.length,
    authoredMaterialSlots: authoredMaterialSlots.length,
    estimatedTriangles,
    authoredTextureBytes,
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
    missingMaterialTextureFileUrls: missingMaterialTextureFiles.map(
      texture => texture.url,
    ),
    deprecatedFields,
    oversizedAssetFiles,
  }
}

function pushBudgetFailure({
  failures,
  report,
  metricKey,
  budgetKey,
  label,
  guidance,
}) {
  const budget = report.graphicsBudget?.[budgetKey]
  if (!Number.isFinite(budget)) return
  if (report[metricKey] <= budget) return

  failures.push(
    `${report.file}: ${label} exceeds graphics budget ${report[metricKey]}/${budget}${guidance ? `; ${guidance}` : ''}`,
  )
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
  if (report.deprecatedFields.length > 0) {
    failures.push(
      `${report.file}: deprecated scene fields must be removed: ${report.deprecatedFields.join(', ')}`,
    )
  }
  if (report.missingGraphicsBudgetKeys.length > 0) {
    failures.push(
      `${report.file}: settings.level.graphicsBudget must define ${report.missingGraphicsBudgetKeys.join(', ')}`,
    )
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
  if (report.missingMaterialTextureFileUrls.length > 0) {
    failures.push(
      `${report.file}: material texture URLs must resolve to public files: ${report.missingMaterialTextureFileUrls.join(', ')}`,
    )
  }
  for (const asset of report.oversizedAssetFiles) {
    failures.push(
      `${report.file}: runtime asset exceeds ${formatBytes(report.graphicsBudget.maxRuntimeAssetFileBytes)} budget: ${asset.url} (${formatBytes(asset.sizeBytes)})`,
    )
  }
  if (
    Number.isFinite(report.graphicsBudget?.maxRuntimeAssetBytes) &&
    report.totalRuntimeAssetBytes > report.graphicsBudget.maxRuntimeAssetBytes
  ) {
    failures.push(
      `${report.file}: scene runtime assets exceed ${formatBytes(report.graphicsBudget.maxRuntimeAssetBytes)} budget: ${formatBytes(report.totalRuntimeAssetBytes)}`,
    )
  }

  pushBudgetFailure({
    failures,
    report,
    metricKey: 'geometryNodes',
    budgetKey: 'maxGeometryActors',
    label: 'geometry actors',
    guidance: 'chunk, merge, or stream repeated actors',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'primitiveNodes',
    budgetKey: 'maxPrimitiveActors',
    label: 'primitive render actors',
    guidance: 'bake repeated primitives into runtime assets or chunks',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'neverCullNodes',
    budgetKey: 'maxNeverCullActors',
    label: 'never-cull render actors',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'gameplayFireflies',
    budgetKey: 'maxGameplayFireflies',
    label: 'firefly gameplay actors',
    guidance: 'use chunked or pooled marker presentation',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'explicitCollision',
    budgetKey: 'maxExplicitColliders',
    label: 'explicit colliders',
    guidance: 'merge collider proxies or move detail collision into baked artifacts',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'lightNodes',
    budgetKey: 'maxLightActors',
    label: 'light actors',
    guidance: 'bake static lighting or reduce realtime lights',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'estimatedDrawCalls',
    budgetKey: 'maxEstimatedDrawCalls',
    label: 'estimated draw calls',
    guidance: 'merge materials, instance repeated meshes, or chunk by stream cell',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'authoredMaterialSlots',
    budgetKey: 'maxAuthoredMaterialSlots',
    label: 'authored material slots',
    guidance: 'merge compatible materials or bake atlases',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'estimatedTriangles',
    budgetKey: 'maxEstimatedTriangles',
    label: 'estimated primitive triangles',
    guidance: 'bake primitives into optimized meshes or author LODs',
  })
  pushBudgetFailure({
    failures,
    report,
    metricKey: 'authoredTextureBytes',
    budgetKey: 'maxAuthoredTextureBytes',
    label: 'authored texture bytes',
    guidance: 'resize or compress scene-authored texture maps',
  })

  return failures
}

export function summarizeSceneReports(reports) {
  return reports.reduce(
    (sum, report) => ({
      nodes: sum.nodes + report.nodes,
      geometryNodes: sum.geometryNodes + report.geometryNodes,
      primitiveNodes: sum.primitiveNodes + report.primitiveNodes,
      lightNodes: sum.lightNodes + report.lightNodes,
      neverCullNodes: sum.neverCullNodes + report.neverCullNodes,
      gameplayFireflies: sum.gameplayFireflies + report.gameplayFireflies,
      explicitCollision: sum.explicitCollision + report.explicitCollision,
      estimatedDrawCalls: sum.estimatedDrawCalls + report.estimatedDrawCalls,
      authoredMaterialSlots:
        sum.authoredMaterialSlots + report.authoredMaterialSlots,
      estimatedTriangles: sum.estimatedTriangles + report.estimatedTriangles,
      authoredTextureBytes:
        sum.authoredTextureBytes + report.authoredTextureBytes,
      missingGraphicsBudgetKeys:
        sum.missingGraphicsBudgetKeys + report.missingGraphicsBudgetKeys.length,
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
      deprecatedFields: sum.deprecatedFields + report.deprecatedFields.length,
      assetFiles: sum.assetFiles + report.assetFiles,
      totalRuntimeAssetBytes:
        sum.totalRuntimeAssetBytes + report.totalRuntimeAssetBytes,
      bomFiles: sum.bomFiles + (report.hasBom ? 1 : 0),
    }),
    {
      nodes: 0,
      geometryNodes: 0,
      primitiveNodes: 0,
      lightNodes: 0,
      neverCullNodes: 0,
      gameplayFireflies: 0,
      explicitCollision: 0,
      estimatedDrawCalls: 0,
      authoredMaterialSlots: 0,
      estimatedTriangles: 0,
      authoredTextureBytes: 0,
      missingGraphicsBudgetKeys: 0,
      missingCollisionIntent: 0,
      missingCollisionChannel: 0,
      invalidCollisionChannel: 0,
      detailMeshWithoutBudget: 0,
      disabledCollision: 0,
      explicitTrimesh: 0,
      missingDefaultCollision: 0,
      deprecatedFields: 0,
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
