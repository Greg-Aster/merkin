import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { auditSourceGuards } from './lib/engineAuditSourceGuards.mjs'
import {
  auditSceneArchitecture,
  formatBytes,
  isFiniteVec3,
} from './lib/sceneArchitectureAudit.mjs'
import { auditRuntimeScenes } from './lib/runtimeSceneAudit.mjs'
import { auditRuntimeAssetManifest } from './lib/runtimeAssetManifestAudit.mjs'
import { auditTerrainCollision } from './lib/terrainCollisionAudit.mjs'
import { auditWorldPartitions } from './lib/worldPartitionAudit.mjs'

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
const runtimeAssetManifestPath = join(
  process.cwd(),
  '../megameal/public/generated/runtime-game-assets/manifest.json',
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
const worldPartitionBudgetByLevel = {
  solitude: {
    maxResidentActors: 8,
    minStreamableActors: 16,
    maxActorsPerCell: 30,
  },
  yggdrasil: {
    maxResidentActors: 80,
    minStreamableActors: 64,
    maxActorsPerCell: 35,
  },
}
const terrainTriangleBudget = 50_000
const sceneAudit = auditSceneArchitecture({ sceneDir, publicDir })
const reports = sceneAudit.reports
const nonRuntimeSceneJsonFiles = sceneAudit.nonRuntimeSceneJsonFiles
const failures = [...sceneAudit.failures]
failures.push(
  ...auditSourceGuards({
    appRoot: process.cwd(),
    editorApiRoutePaths: [gameEditorToolsBridgePath],
  }),
)

function stripBom(source) {
  return source.replace(/^\uFEFF/, '')
}

function normalizePublicPath(path) {
  return path.replace(/^\//, '')
}

function readJsonFile(fullPath) {
  return JSON.parse(stripBom(readFileSync(fullPath, 'utf8')))
}

const terrainAudit = auditTerrainCollision({
  terrainDir,
  publicDir,
  bakedTerrainManifests,
  requiredChunkedManifests: chunkedTerrainRequiredManifests,
  terrainTriangleBudget,
})
const terrainReports = terrainAudit.terrainReports
const legacyTerrainManifestReports = terrainAudit.legacyTerrainManifestReports
failures.push(...terrainAudit.failures)

const worldPartitionAudit = auditWorldPartitions({
  worldPartitionDir,
  requiredLevels: requiredWorldPartitionLevels,
  budgetByLevel: worldPartitionBudgetByLevel,
  readJsonFile,
})
const worldPartitionReports = worldPartitionAudit.reports
failures.push(...worldPartitionAudit.failures)

const runtimeSceneAudit = auditRuntimeScenes({
  appRoot: process.cwd(),
  runtimeSceneDir,
  isFiniteVec3,
  readJsonFile,
})
const runtimeSceneReports = runtimeSceneAudit.reports
failures.push(...runtimeSceneAudit.failures)

const runtimeAssetManifestAudit = auditRuntimeAssetManifest({
  manifestPath: runtimeAssetManifestPath,
  runtimeSceneDir,
  readJsonFile,
})
const runtimeAssetManifestReport = runtimeAssetManifestAudit.report
failures.push(...runtimeAssetManifestAudit.failures)

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
      `lights=${report.lightNodes}`,
      `neverCull=${report.neverCullNodes}`,
      `fireflies=${report.gameplayFireflies}`,
      `explicitCollision=${report.explicitCollision}`,
      `drawCallsEst=${report.estimatedDrawCalls}`,
      `materialSlots=${report.authoredMaterialSlots}`,
      `trianglesEst=${report.estimatedTriangles}`,
      `textureSize=${formatBytes(report.authoredTextureBytes)}`,
      `missingBudgetKeys=${report.missingGraphicsBudgetKeys.length}`,
      `missingIntent=${report.missingCollisionIntent}`,
      `missingChannel=${report.missingCollisionChannel}`,
      `invalidChannel=${report.invalidCollisionChannel}`,
      `detailMeshWithoutBudget=${report.detailMeshWithoutBudget}`,
      `disabledCollision=${report.disabledCollision}`,
      `explicitTrimesh=${report.explicitTrimesh}`,
      `missingDefaultCollision=${report.missingDefaultCollision}`,
      `deprecatedFields=${report.deprecatedFields.length}`,
      `assetFiles=${report.assetFiles}`,
      `assetSize=${formatBytes(report.totalRuntimeAssetBytes)}`,
      `spawn=${report.hasValidSpawn ? `[${report.spawnPosition.join(',')}]` : 'invalid'}`,
      `bom=${report.hasBom ? 'yes' : 'no'}`,
    ].join('  '),
  )

  if (report.largestAsset && report.largestAsset.sizeBytes > 0) {
    console.log(
      `  largest asset: ${report.largestAsset.url} (${formatBytes(report.largestAsset.sizeBytes)})`,
    )
  }
}

const totals = sceneAudit.totals

console.log('--------------------------------')
console.log(
  [
    'TOTAL',
    `nodes=${totals.nodes}`,
    `geometry=${totals.geometryNodes}`,
    `primitives=${totals.primitiveNodes}`,
    `lights=${totals.lightNodes}`,
    `neverCull=${totals.neverCullNodes}`,
    `fireflies=${totals.gameplayFireflies}`,
    `explicitCollision=${totals.explicitCollision}`,
    `drawCallsEst=${totals.estimatedDrawCalls}`,
    `materialSlots=${totals.authoredMaterialSlots}`,
    `trianglesEst=${totals.estimatedTriangles}`,
    `textureSize=${formatBytes(totals.authoredTextureBytes)}`,
    `missingBudgetKeys=${totals.missingGraphicsBudgetKeys}`,
    `missingIntent=${totals.missingCollisionIntent}`,
    `missingChannel=${totals.missingCollisionChannel}`,
    `invalidChannel=${totals.invalidCollisionChannel}`,
    `detailMeshWithoutBudget=${totals.detailMeshWithoutBudget}`,
    `disabledCollision=${totals.disabledCollision}`,
    `explicitTrimesh=${totals.explicitTrimesh}`,
    `missingDefaultCollision=${totals.missingDefaultCollision}`,
    `deprecatedFields=${totals.deprecatedFields}`,
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
      `deprecatedFields=${report.deprecatedFields}`,
      `graphicsBudget=${report.hasGraphicsBudget ? 'yes' : 'no'}`,
    ].join('  '),
  )
}

console.log('')
console.log('Runtime asset manifest audit')
console.log('============================')
console.log(
  [
    `exists=${runtimeAssetManifestReport.exists ? 'yes' : 'no'}`,
    `sourceAssets=${runtimeAssetManifestReport.sourceAssetCount}`,
    `required=${runtimeAssetManifestReport.requiredAssetCount}`,
    `optional=${runtimeAssetManifestReport.optionalAssetCount}`,
    `metadata=${runtimeAssetManifestReport.metadataAssetCount}`,
    `cookedVariants=${runtimeAssetManifestReport.cookedVariantCount}`,
    `variantMetadata=${runtimeAssetManifestReport.variantMetadataCount}`,
    `missingMetadata=${runtimeAssetManifestReport.missingMetadata}`,
    `missingVariantMetadata=${runtimeAssetManifestReport.missingVariantMetadata}`,
    `missingLodTier=${runtimeAssetManifestReport.missingLodTier}`,
    `missingLodContract=${runtimeAssetManifestReport.missingLodContract}`,
    `missingImpostor=${runtimeAssetManifestReport.missingImpostorDescriptor}`,
    `missingStatus=${runtimeAssetManifestReport.missingStatus}`,
    `missingTextureRefs=${runtimeAssetManifestReport.missingTextureReferences}`,
    `missingRecommendedSlots=${runtimeAssetManifestReport.missingRecommendedMaterialSlots}`,
    `unsupportedShaders=${runtimeAssetManifestReport.unsupportedShaderFeatures}`,
    `oversizedTextures=${runtimeAssetManifestReport.oversizedTextures}`,
  ].join('  '),
)
for (const report of runtimeAssetManifestReport.budgetReports) {
  console.log(
    [
      `  ${report.levelId}`,
      `tier=${report.tier}`,
      `payload=${formatBytes(report.runtimeAssetBytes)}`,
      `largest=${formatBytes(report.largestRuntimeAssetBytes)}`,
      `drawCalls=${report.combinedDrawCalls}`,
      `materialSlots=${report.combinedMaterialSlots}`,
      `triangles=${report.combinedTriangles}`,
      `textureSize=${formatBytes(report.combinedTextureBytes)}`,
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
      `readinessGates=${report.readinessGates}`,
      `initialCells=${report.initialCells}`,
      `residentRender=${report.residentRenderActors}`,
      `residentCollision=${report.residentCollisionActors}`,
      `initialRender=${report.initialRenderActors}`,
      `initialCollision=${report.initialCollisionActors}`,
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
