import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const colliderMagic = 0x4d4d5443
const colliderVersion = 1

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

function isValidMaterialFactor(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1
}

function validateTerrainChunkMaterial(file, manifest, failures) {
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

function validateTerrainChunkActivation(file, manifest, failures) {
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

function assertEqual({ label, expected, actual, manifestFile, failures }) {
  if (expected !== actual) {
    failures.push(
      `${manifestFile}: ${label} mismatch expected=${expected} actual=${actual}`,
    )
  }
}

function auditTerrainManifest({
  file,
  terrainDir,
  publicDir,
  requiredChunkedManifests,
  terrainTriangleBudget,
  failures,
}) {
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
  if (collision?.sourceLinked !== true) {
    failures.push(`${file}: baked terrain collision must set sourceLinked=true`)
  }
  if (requiredChunkedManifests.has(file) && !manifest.assets?.chunksPath) {
    failures.push(`${file}: terrain visual chunks are required`)
  }
  if (manifest.assets?.chunksPath) {
    validateTerrainChunkMaterial(file, manifest, failures)
    validateTerrainChunkActivation(file, manifest, failures)

    const chunkDir = join(publicDir, normalizePublicPath(manifest.assets.chunksPath))
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

  const artifactPath = join(publicDir, normalizePublicPath(collision.url))
  const metadataPath = join(publicDir, normalizePublicPath(collision.metadataUrl))

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

    assertEqual({
      label: 'metadata type',
      expected: 'baked-terrain-mesh',
      actual: metadata.type,
      manifestFile: file,
      failures,
    })
    assertEqual({
      label: 'vertexCount manifest/header',
      expected: collision.vertexCount,
      actual: header.vertexCount,
      manifestFile: file,
      failures,
    })
    assertEqual({
      label: 'triangleCount manifest/header',
      expected: collision.triangleCount,
      actual: header.triangleCount,
      manifestFile: file,
      failures,
    })
    assertEqual({
      label: 'colliderResolution manifest/header',
      expected: collision.colliderResolution,
      actual: header.colliderResolution,
      manifestFile: file,
      failures,
    })
    assertEqual({
      label: 'sampleStep manifest/header',
      expected: collision.sampleStep,
      actual: header.sampleStep,
      manifestFile: file,
      failures,
    })
    assertEqual({
      label: 'vertexCount metadata/header',
      expected: metadata.vertexCount,
      actual: header.vertexCount,
      manifestFile: file,
      failures,
    })
    assertEqual({
      label: 'triangleCount metadata/header',
      expected: metadata.triangleCount,
      actual: header.triangleCount,
      manifestFile: file,
      failures,
    })

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

function auditLegacyTerrainManifest({ file, terrainDir, failures }) {
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
}

export function auditTerrainCollision({
  terrainDir,
  publicDir,
  bakedTerrainManifests,
  requiredChunkedManifests,
  terrainTriangleBudget,
}) {
  const failures = []
  const terrainManifestFiles = readdirSync(terrainDir)
    .filter(file => file.endsWith('.manifest.json'))
    .sort()
  const terrainReports = bakedTerrainManifests.map(file =>
    auditTerrainManifest({
      file,
      terrainDir,
      publicDir,
      requiredChunkedManifests,
      terrainTriangleBudget,
      failures,
    }),
  )
  const legacyTerrainManifestReports = terrainManifestFiles.map(file =>
    auditLegacyTerrainManifest({ file, terrainDir, failures }),
  )

  return {
    failures,
    terrainReports,
    legacyTerrainManifestReports,
  }
}
