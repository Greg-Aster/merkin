import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { classifyTerrainAuthority } from '../../src/threlte/engine/groundContractCore.mjs'

const terrainModes = new Set([
  'scene-authored',
  'heightfield-terrain',
  'glb-chunk-terrain',
])
const visualSources = new Set([
  'scene-actors',
  'heightmap-surface',
  'generated-heightmap-chunks',
  'source-glb-chunks',
  'none',
])
const fallbackSurfacePolicies = new Set([
  'disabled',
  'debug-only',
  'until-required-chunks-ready',
  'always',
])
const collisionSources = new Set([
  'baked-heightfield',
  'scene-colliders',
  'source-linked-terrain-collision',
])
const transitionWarningStatuses = new Set(['transitional', 'planned'])

function stripBom(source) {
  return source.replace(/^\uFEFF/, '')
}

function readJsonFile(fullPath) {
  return JSON.parse(stripBom(readFileSync(fullPath, 'utf8')))
}

function normalizePublicPath(path) {
  return path.replace(/^\//, '')
}

function stableStringify(value) {
  return JSON.stringify(sortJson(value))
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortJson(entry)]),
  )
}

function getManifestPath(publicDir, manifestUrl) {
  if (typeof manifestUrl !== 'string' || !manifestUrl.trim()) return null
  return join(publicDir, normalizePublicPath(manifestUrl))
}

function readTerrainManifest(publicDir, manifestUrl) {
  const manifestPath = getManifestPath(publicDir, manifestUrl)
  if (!manifestPath || !existsSync(manifestPath)) return null
  return {
    file: basename(manifestPath),
    manifest: readJsonFile(manifestPath),
  }
}

function hasTerrainSourceGlb(manifest, levelSettings) {
  return Boolean(
    levelSettings?.collision?.terrain?.sourceAssetUrl ||
      levelSettings?.collision?.terrain?.sourceAssetUrls?.length ||
      manifest?.assets?.sourceGlb ||
      manifest?.assets?.sourceAssetUrl ||
      manifest?.source?.assetUrl,
  )
}

function hasTerrainChunks(manifest) {
  return Boolean(manifest?.assets?.chunksPath || manifest?.visualChunks)
}

function getSourceFingerprint(contract, sourceAssetUrl) {
  if (!contract || !sourceAssetUrl) return null
  if (contract.sourceAssetUrl === sourceAssetUrl) {
    return contract.sourceAssetFingerprint ?? null
  }
  return (
    contract.sourceAssetFingerprints?.find(entry => entry?.url === sourceAssetUrl)
      ?.fingerprint ?? null
  )
}

function fingerprintsMatch(left, right) {
  if (!left?.value || !right?.value) return false
  return left.algorithm === right.algorithm && left.value === right.value
}

function validateSourceLinkedCollisionContract({ failures, file, manifest }) {
  const visualContract = manifest?.visualChunks?.sourceContract
  const collisionContract = manifest?.collision?.terrain?.sourceContract
  const sourceAssetUrl = visualContract?.sourceAssetUrl

  if (!visualContract || !collisionContract) {
    failures.push(
      `${file}: source-linked terrain collision requires visual and collision source contracts`,
    )
    return
  }
  if (visualContract.terrainSourceType !== 'glb-chunk-terrain') {
    failures.push(
      `${file}: source-linked terrain collision requires glb-chunk-terrain visual provenance`,
    )
  }
  if (collisionContract.terrainSourceType !== 'glb-chunk-terrain') {
    failures.push(
      `${file}: source-linked terrain collision requires glb-chunk-terrain collision provenance`,
    )
  }
  if (
    !sourceAssetUrl ||
    ![
      collisionContract.sourceAssetUrl,
      ...(collisionContract.sourceAssetUrls ?? []),
      ...(collisionContract.authoredSourceAssetUrls ?? []),
    ].includes(sourceAssetUrl)
  ) {
    failures.push(
      `${file}: source-linked terrain collision must reference the visual source GLB`,
    )
  }

  const visualFingerprint = getSourceFingerprint(visualContract, sourceAssetUrl)
  const collisionFingerprint = getSourceFingerprint(
    collisionContract,
    sourceAssetUrl,
  )
  if (!fingerprintsMatch(visualFingerprint, collisionFingerprint)) {
    failures.push(
      `${file}: source-linked terrain collision source hash must match the visual source GLB`,
    )
  }
}

function countChunkFiles(publicDir, manifest) {
  if (!manifest?.assets?.chunksPath) return 0
  const chunkDir = join(publicDir, normalizePublicPath(manifest.assets.chunksPath))
  if (!existsSync(chunkDir)) return 0
  return readdirSync(chunkDir).filter(entry =>
    /^chunk_\d+_\d+_LOD\d+\.glb$/i.test(entry),
  ).length
}

function countConventionalLevelChunkFiles(publicDir, levelId) {
  if (typeof levelId !== 'string' || !levelId.trim()) return 0
  const chunkDir = join(publicDir, 'terrain', 'levels', levelId)
  if (!existsSync(chunkDir)) return 0
  return readdirSync(chunkDir).filter(entry =>
    /^chunk_\d+_\d+_LOD\d+\.glb$/i.test(entry),
  ).length
}

function addMigrationIssue({
  failures,
  warnings,
  sceneFile,
  migration,
  message,
}) {
  if (transitionWarningStatuses.has(migration?.status)) {
    warnings.push(`${sceneFile}: ${message}`)
    return
  }
  failures.push(`${sceneFile}: ${message}`)
}

function validateValue({ failures, file, label, value, allowed }) {
  if (!allowed.has(String(value))) {
    failures.push(`${file}: ${label} "${value}" is invalid`)
  }
}

function validateRequiredString({ failures, file, label, value }) {
  if (typeof value !== 'string' || !value.trim()) {
    failures.push(`${file}: ${label} is required`)
  }
}

function validateGeneratedProductRecord({
  failures,
  file,
  label,
  product,
}) {
  if (!product || typeof product !== 'object') {
    failures.push(`${file}: terrainMigration.generatedTerrainProducts.${label} is required`)
    return
  }
  validateRequiredString({
    failures,
    file,
    label: `terrainMigration.generatedTerrainProducts.${label}.path`,
    value: product.path,
  })
  validateRequiredString({
    failures,
    file,
    label: `terrainMigration.generatedTerrainProducts.${label}.status`,
    value: product.status,
  })
  validateRequiredString({
    failures,
    file,
    label: `terrainMigration.generatedTerrainProducts.${label}.reason`,
    value: product.reason,
  })
  validateRequiredString({
    failures,
    file,
    label: `terrainMigration.generatedTerrainProducts.${label}.targetRemovalCondition`,
    value: product.targetRemovalCondition,
  })
}

function getGeneratedProductRecord(migration, label) {
  return migration?.generatedTerrainProducts?.[label] ?? null
}

function validateTerrainMigration({
  file,
  scene,
  manifestRecord,
  publicDir,
  failures,
  warnings,
  enforceFinalAuthority = false,
}) {
  const levelSettings = scene.settings?.level ?? {}
  const ground = levelSettings.ground ?? {}
  const terrain = levelSettings.collision?.terrain
  const migration = levelSettings.terrainMigration
  const manifest = manifestRecord?.manifest
  const authority = classifyTerrainAuthority({
    level: {
      id: scene.levelId ?? file.replace(/\.scene\.json$/, ''),
      settings: scene.settings,
    },
    manifest,
    manifestUrl: ground.terrainManifestUrl,
    enforceFinalAuthority,
  })
  const report = {
    file,
    levelId: scene.levelId ?? '<missing>',
    mode: migration?.currentMode ?? 'missing',
    visualSource: migration?.authoritativeVisualSource ?? 'missing',
    collisionSource: migration?.collisionSource ?? 'missing',
    mixedAuthority: authority.mixedAuthority,
    renderChunks: migration?.renderChunks?.present === true,
    renderChunksAuthoritative: migration?.renderChunks?.authoritative === true,
    fallbackSurfacePolicy: migration?.fallbackSurfacePolicy ?? 'missing',
    migrationTarget: migration?.targetMode ?? 'missing',
    migrationStatus: migration?.status ?? 'missing',
    generatedHeightmapStatus:
      migration?.generatedTerrainProducts?.heightmap?.status ?? 'none',
    generatedVisualChunkStatus:
      migration?.generatedTerrainProducts?.visualChunks?.status ?? 'none',
    collisionProductStatus:
      migration?.generatedTerrainProducts?.collision?.status ?? 'none',
    blockers: Array.isArray(migration?.blockers)
      ? migration.blockers.length
      : 0,
    warnings: 0,
  }

  if (!migration) {
    failures.push(`${file}: settings.level.terrainMigration is required`)
    return report
  }

  if (
    manifest?.collision?.terrain?.url &&
    !manifest.collision.terrain.sourceContract
  ) {
    failures.push(
      `${file}: baked terrain collision requires sourceContract metadata`,
    )
  }

  validateValue({
    failures,
    file,
    label: 'terrainMigration.currentMode',
    value: migration.currentMode,
    allowed: terrainModes,
  })
  validateValue({
    failures,
    file,
    label: 'terrainMigration.authoritativeVisualSource',
    value: migration.authoritativeVisualSource,
    allowed: visualSources,
  })
  validateValue({
    failures,
    file,
    label: 'terrainMigration.collisionSource',
    value: migration.collisionSource,
    allowed: collisionSources,
  })
  validateValue({
    failures,
    file,
    label: 'terrainMigration.fallbackSurfacePolicy',
    value: migration.fallbackSurfacePolicy,
    allowed: fallbackSurfacePolicies,
  })
  validateValue({
    failures,
    file,
    label: 'terrainMigration.targetMode',
    value: migration.targetMode,
    allowed: terrainModes,
  })

  if (ground.terrainRuntimeMode !== migration.currentMode) {
    failures.push(
      `${file}: ground.terrainRuntimeMode must match terrainMigration.currentMode`,
    )
  }
  if (ground.terrainVisualSource !== migration.authoritativeVisualSource) {
    failures.push(
      `${file}: ground.terrainVisualSource must match terrainMigration.authoritativeVisualSource`,
    )
  }
  if (ground.fallbackSurfacePolicy !== migration.fallbackSurfacePolicy) {
    failures.push(
      `${file}: ground.fallbackSurfacePolicy must match terrainMigration.fallbackSurfacePolicy`,
    )
  }
  if (terrain) {
    if (terrain.runtimeMode !== migration.currentMode) {
      failures.push(
        `${file}: collision.terrain.runtimeMode must match terrainMigration.currentMode`,
      )
    }
    if (
      terrain.visualSource &&
      terrain.visualSource !== migration.authoritativeVisualSource &&
      !(migration.currentMode === 'scene-authored' && terrain.visualSource === 'none')
    ) {
      failures.push(
        `${file}: collision.terrain.visualSource must match terrainMigration.authoritativeVisualSource or be none for scene-authored terrain`,
      )
    }
    if (terrain.fallbackSurfacePolicy !== migration.fallbackSurfacePolicy) {
      failures.push(
        `${file}: collision.terrain.fallbackSurfacePolicy must match terrainMigration.fallbackSurfacePolicy`,
      )
    }
  }

  if (migration.currentMode === 'heightfield-terrain') {
    if (migration.collisionSource !== 'baked-heightfield') {
      failures.push(`${file}: heightfield-terrain requires baked-heightfield collision`)
    }
    if (!['heightmap-surface', 'generated-heightmap-chunks'].includes(migration.authoritativeVisualSource)) {
      failures.push(
        `${file}: heightfield-terrain visual source must be heightmap-surface or generated-heightmap-chunks`,
      )
    }
  }

  if (
    migration.currentMode === 'scene-authored' &&
    migration.collisionSource !== 'scene-colliders'
  ) {
    failures.push(
      `${file}: scene-authored terrain must use scene-colliders collision; baked heightfields are only valid for heightfield-terrain.`,
    )
  }
  if (
    migration.currentMode === 'scene-authored' &&
    (ground.terrainManifestUrl || terrain?.manifestUrl)
  ) {
    failures.push(
      `${file}: scene-authored terrain must not keep terrain manifest references; author walkable collision as scene colliders.`,
    )
  }

  if (migration.currentMode === 'glb-chunk-terrain') {
    const approvedHeightfieldException =
      migration.approvedHeightfieldException === true ||
      ground.approvedHeightfieldException === true ||
      terrain?.approvedHeightfieldException === true
    if (migration.authoritativeVisualSource !== 'source-glb-chunks') {
      failures.push(`${file}: glb-chunk-terrain requires source-glb-chunks visuals`)
    }
    if (
      migration.collisionSource !== 'source-linked-terrain-collision' &&
      !(
        migration.collisionSource === 'baked-heightfield' &&
        approvedHeightfieldException &&
        transitionWarningStatuses.has(migration.status)
      )
    ) {
      failures.push(
        `${file}: glb-chunk-terrain requires source-linked-terrain-collision or an approved transitional baked-heightfield exception`,
      )
    }
    if (migration.collisionSource === 'source-linked-terrain-collision') {
      validateSourceLinkedCollisionContract({ failures, file, manifest })
    }
    if (manifest?.visualChunks?.preservesSourceUvs !== true) {
      failures.push(`${file}: glb-chunk-terrain requires UV preservation metadata`)
    }
    if (manifest?.visualChunks?.preservesSourceMaterialSlots !== true) {
      failures.push(
        `${file}: glb-chunk-terrain requires material slot preservation metadata`,
      )
    }
  }

  if (
    migration.renderChunks?.authoritative === true &&
    migration.fallbackSurfacePolicy === 'always'
  ) {
    addMigrationIssue({
      failures,
      warnings,
      sceneFile: file,
      migration,
      message:
        'heightmap fallback surface is enabled as primary terrain while chunks are authoritative',
    })
  }

  if (
    hasTerrainSourceGlb(manifest, levelSettings) &&
    migration.currentMode !== 'glb-chunk-terrain'
  ) {
    if (migration.targetMode === 'glb-chunk-terrain') {
      addMigrationIssue({
        failures,
        warnings,
        sceneFile: file,
        migration,
        message:
          'source GLB reference is present but is not used by the declared terrain mode',
      })
    } else {
      warnings.push(
        `${file}: source GLB reference is present but this level is declared scene-authored`,
      )
    }
  }

  if (migration.renderChunks?.present === true && manifest) {
    const chunkFiles = countChunkFiles(publicDir, manifest)
    if (chunkFiles === 0) {
      failures.push(`${file}: render chunks are declared present but no chunk GLBs exist`)
    }
  }

  if (
    migration.currentMode === 'scene-authored' &&
    migration.authoritativeVisualSource !== 'scene-actors'
  ) {
    failures.push(`${file}: scene-authored terrain requires scene-actors visuals`)
  }
  if (
    migration.currentMode === 'scene-authored' &&
    migration.renderChunks?.authoritative === true
  ) {
    failures.push(`${file}: scene-authored terrain cannot mark render chunks authoritative`)
  }
  if (authority.mixedAuthority) {
    const message = `${file}: scene-authored terrain uses baked-heightfield collision; migrate to scene-colliders, true heightfield-terrain, or glb-chunk-terrain before final terrain authority gate`
    if (enforceFinalAuthority) {
      failures.push(message)
    } else {
      warnings.push(message)
    }
  }
  if (
    migration.currentMode === 'scene-authored' &&
    hasTerrainChunks(manifest) &&
    migration.renderChunks?.present !== true
  ) {
    failures.push(`${file}: terrain manifest has chunks but migration.renderChunks.present is not true`)
  }
  if (
    migration.currentMode === 'scene-authored' &&
    migration.status === 'complete' &&
    migration.renderChunks?.present === true &&
    migration.renderChunks?.source === 'generated-heightmap'
  ) {
    failures.push(
      `${file}: completed scene-authored terrain cannot retain generated heightmap visual chunks`,
    )
  }
  if (
    migration.currentMode === 'scene-authored' &&
    migration.status === 'complete' &&
    !hasTerrainChunks(manifest)
  ) {
    const staleChunkFiles = countConventionalLevelChunkFiles(
      publicDir,
      scene.levelId,
    )
    if (staleChunkFiles > 0) {
      failures.push(
        `${file}: completed scene-authored terrain has ${staleChunkFiles} stale generated visual chunk files under /terrain/levels/${scene.levelId}/`,
      )
    }
  }
  if (manifest?.assets?.heightmap) {
    validateGeneratedProductRecord({
      failures,
      file,
      label: 'heightmap',
      product: getGeneratedProductRecord(migration, 'heightmap'),
    })
  }
  if (hasTerrainChunks(manifest)) {
    validateGeneratedProductRecord({
      failures,
      file,
      label: 'visualChunks',
      product: getGeneratedProductRecord(migration, 'visualChunks'),
    })
  }
  if (manifest?.collision?.terrain?.url) {
    validateGeneratedProductRecord({
      failures,
      file,
      label: 'collision',
      product: getGeneratedProductRecord(migration, 'collision'),
    })
  }

  if (
    Array.isArray(migration.warningsBecomeBlockersAfterMigration) === false
  ) {
    failures.push(
      `${file}: terrainMigration.warningsBecomeBlockersAfterMigration must be an array`,
    )
  }

  report.warnings = warnings.length
  return report
}

function validateManifestContract({
  sceneFile,
  manifestRecord,
  migration,
  failures,
  warnings,
}) {
  if (!manifestRecord) return

  const { file, manifest } = manifestRecord
  const runtime = manifest.runtime

  if (!runtime) {
    failures.push(`${file}: runtime terrain contract is required`)
    return
  }

  validateValue({
    failures,
    file,
    label: 'runtime.mode',
    value: runtime.mode,
    allowed: terrainModes,
  })
  validateValue({
    failures,
    file,
    label: 'runtime.visualSource',
    value: runtime.visualSource,
    allowed: visualSources,
  })
  validateValue({
    failures,
    file,
    label: 'runtime.fallbackSurfacePolicy',
    value: runtime.fallbackSurfacePolicy,
    allowed: fallbackSurfacePolicies,
  })

  if (runtime.mode !== migration?.currentMode) {
    failures.push(`${file}: runtime.mode must match ${sceneFile} terrainMigration.currentMode`)
  }
  if (
    runtime.visualSource !== migration?.authoritativeVisualSource &&
    !(migration?.currentMode === 'scene-authored' && runtime.visualSource === 'none')
  ) {
    failures.push(
      `${file}: runtime.visualSource must match ${sceneFile} authoritative visual source or be none for scene-authored terrain`,
    )
  }
  if (runtime.fallbackSurfacePolicy !== migration?.fallbackSurfacePolicy) {
    failures.push(
      `${file}: runtime.fallbackSurfacePolicy must match ${sceneFile} terrainMigration.fallbackSurfacePolicy`,
    )
  }

  if (manifest.visualChunks) {
    validateRequiredString({
      failures,
      file,
      label: 'visualChunks.source',
      value: manifest.visualChunks.source,
    })
    if (typeof manifest.visualChunks.preservesSourceUvs !== 'boolean') {
      failures.push(`${file}: visualChunks.preservesSourceUvs must be explicit`)
    }
    if (typeof manifest.visualChunks.preservesSourceMaterialSlots !== 'boolean') {
      failures.push(
        `${file}: visualChunks.preservesSourceMaterialSlots must be explicit`,
      )
    }
  }

  if (
    runtime.mode === 'glb-chunk-terrain' &&
    manifest.visualChunks?.source !== 'source-glb'
  ) {
    failures.push(`${file}: glb-chunk-terrain requires visualChunks.source=source-glb`)
  }

  if (
    runtime.mode === 'scene-authored' &&
    hasTerrainChunks(manifest) &&
    manifest.visualChunks?.source === 'generated-heightmap'
  ) {
    const retainedChunks = getGeneratedProductRecord(
      migration,
      'visualChunks',
    )
    if (retainedChunks) {
      const message = `${file}: generated heightmap chunks retained (${retainedChunks.status}) because ${retainedChunks.reason} Target removal: ${retainedChunks.targetRemovalCondition}`
      if (
        migration?.status === 'complete' ||
        retainedChunks.status === 'retained-unreferenced-visuals'
      ) {
        failures.push(message)
      } else {
        warnings.push(message)
      }
    } else {
      failures.push(
        `${file}: generated heightmap chunks are present but scene terrain visuals are authoritative; document terrainMigration.generatedTerrainProducts.visualChunks`,
      )
    }
  }
}

function getRuntimeTerrainSubset(runtimeScene) {
  const levelSettings = runtimeScene?.levelDefinition?.settings?.level
  return {
    ground: {
      terrainRuntimeMode: levelSettings?.ground?.terrainRuntimeMode,
      terrainVisualSource: levelSettings?.ground?.terrainVisualSource,
      fallbackSurfacePolicy: levelSettings?.ground?.fallbackSurfacePolicy,
      terrainManifestUrl: levelSettings?.ground?.terrainManifestUrl,
    },
    terrainMigration: levelSettings?.terrainMigration,
  }
}

function validateRuntimeSceneDrift({
  file,
  scene,
  runtimeSceneDir,
  failures,
}) {
  const runtimePath = join(
    runtimeSceneDir,
    `${scene.levelId}.runtime-scene.json`,
  )
  if (!existsSync(runtimePath)) {
    failures.push(`${file}: missing runtime scene manifest for terrain drift audit`)
    return
  }

  const runtimeScene = readJsonFile(runtimePath)
  const expected = {
    ground: {
      terrainRuntimeMode: scene.settings?.level?.ground?.terrainRuntimeMode,
      terrainVisualSource: scene.settings?.level?.ground?.terrainVisualSource,
      fallbackSurfacePolicy: scene.settings?.level?.ground?.fallbackSurfacePolicy,
      terrainManifestUrl: scene.settings?.level?.ground?.terrainManifestUrl,
    },
    terrainMigration: scene.settings?.level?.terrainMigration,
  }
  const actual = getRuntimeTerrainSubset(runtimeScene)

  if (stableStringify(actual) !== stableStringify(expected)) {
    failures.push(
      `${file}: runtime scene terrain contract drifted from authoring scene`,
    )
  }
}

export function auditTerrainContracts({
  sceneDir,
  publicDir,
  runtimeSceneDir,
  enforceFinalAuthority = true,
}) {
  const failures = []
  const warnings = []
  const reports = []

  for (const file of readdirSync(sceneDir).sort()) {
    if (!file.endsWith('.scene.json')) continue

    const scene = readJsonFile(join(sceneDir, file))
    const manifestRecord = readTerrainManifest(
      publicDir,
      scene.settings?.level?.ground?.terrainManifestUrl,
    )
    const report = validateTerrainMigration({
      file,
      scene,
      manifestRecord,
      publicDir,
      failures,
      warnings,
      enforceFinalAuthority,
    })
    reports.push(report)
    validateManifestContract({
      sceneFile: file,
      manifestRecord,
      migration: scene.settings?.level?.terrainMigration,
      failures,
      warnings,
    })
    if (runtimeSceneDir) {
      validateRuntimeSceneDrift({
        file,
        scene,
        runtimeSceneDir,
        failures,
      })
    }
  }

  return {
    failures,
    warnings,
    reports,
  }
}
