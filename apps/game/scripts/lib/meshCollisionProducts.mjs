import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const meshCollisionGeneratorVersion = 'mesh-collision-manager-v2'

const generatedColliderRoot = '/generated/runtime-game-assets/collision/'
const terrainColliderRoot = '/terrain/collision/'
const artifactBackedQualities = new Set([
  'convexHull',
  'simplifiedMesh',
  'trimesh',
])
const meshProductShapes = new Set(['convexHull', 'trimesh'])

function isFiniteVec3(value) {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function isFiniteBounds(value) {
  return (
    Boolean(value) &&
    isFiniteVec3(value.min) &&
    isFiniteVec3(value.max) &&
    isFiniteVec3(value.size) &&
    isFiniteVec3(value.center)
  )
}

function normalizeBounds(value) {
  if (!isFiniteBounds(value)) return null
  return {
    min: value.min.slice(0, 3),
    max: value.max.slice(0, 3),
    size: value.size.slice(0, 3),
    center: value.center.slice(0, 3),
  }
}

function boundsMatch(left, right, epsilon = 0.0001) {
  if (!isFiniteBounds(left) || !isFiniteBounds(right)) return false
  return ['min', 'max', 'size', 'center'].every(key =>
    left[key].every(
      (component, index) => Math.abs(component - right[key][index]) <= epsilon,
    ),
  )
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function fingerprintObject(value) {
  return {
    algorithm: 'sha256',
    value: sha256(stableJson(value)),
  }
}

function fingerprintFile(path) {
  return {
    algorithm: 'sha256',
    value: createHash('sha256').update(readFileSync(path)).digest('hex'),
  }
}

function getFingerprintValue(fingerprint) {
  if (typeof fingerprint === 'string') return fingerprint
  return typeof fingerprint?.value === 'string' ? fingerprint.value : ''
}

function isFingerprintLike(fingerprint) {
  if (typeof fingerprint === 'string') return fingerprint.length > 0
  return (
    Boolean(fingerprint) &&
    typeof fingerprint.algorithm === 'string' &&
    typeof fingerprint.value === 'string' &&
    fingerprint.value.length > 0
  )
}

function normalizePublicUrl(url) {
  const normalized = String(url ?? '').trim()
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export function resolvePublicAssetPath(publicRoot, url) {
  const normalized = decodeURIComponent(
    normalizePublicUrl(url).split('?')[0],
  ).replace(/^\/+/, '')
  const fullPath = resolve(publicRoot, normalized)
  const resolvedRoot = resolve(publicRoot)
  if (
    fullPath !== resolvedRoot &&
    !fullPath.startsWith(
      `${resolvedRoot}${process.platform === 'win32' ? '\\' : '/'}`,
    )
  ) {
    throw new Error(`Public asset resolves outside public root: ${url}`)
  }
  return fullPath
}

export function getMeshCollisionMetadataUrl(collision) {
  const explicit = String(collision?.colliderMetadataUrl ?? '').trim()
  if (explicit) return explicit
  const colliderUrl = String(collision?.colliderUrl ?? '').trim()
  if (!colliderUrl) return ''
  return colliderUrl.replace(/\.collider\.glb$/i, '.collider.meta.json')
}

function getNodeSourceDescriptor(node, { resolvePrefabAssetUrl } = {}) {
  const colliderSourceAssetUrl = node.collision?.colliderSourceAssetUrl
  if (colliderSourceAssetUrl) {
    return {
      kind: node.prefab?.type ? 'prefab' : 'asset',
      sourceMeshUrl: normalizePublicUrl(colliderSourceAssetUrl),
      ...(node.prefab?.type ? { prefab: node.prefab } : {}),
      visualSourceMeshUrl: node.collision?.sourceAssetUrl
        ? normalizePublicUrl(node.collision.sourceAssetUrl)
        : node.asset?.url
          ? normalizePublicUrl(node.asset.url)
          : '',
    }
  }
  if (node.asset?.url) {
    return {
      kind: 'asset',
      sourceMeshUrl: normalizePublicUrl(node.asset.url),
      visualSourceMeshUrl: normalizePublicUrl(node.asset.url),
    }
  }
  if (node.prefab?.type) {
    if (node.collision?.sourceAssetUrl) {
      return {
        kind: 'prefab',
        sourceMeshUrl: normalizePublicUrl(node.collision.sourceAssetUrl),
        visualSourceMeshUrl: normalizePublicUrl(node.collision.sourceAssetUrl),
        prefab: node.prefab,
      }
    }
    const sourceMeshUrl = resolvePrefabAssetUrl?.(
      node.prefab.type,
      node.prefab.variant ?? null,
    )
    return {
      kind: 'prefab',
      sourceMeshUrl: sourceMeshUrl ? normalizePublicUrl(sourceMeshUrl) : '',
      visualSourceMeshUrl: sourceMeshUrl ? normalizePublicUrl(sourceMeshUrl) : '',
      prefab: node.prefab,
    }
  }
  if (node.primitive) {
    return {
      kind: 'primitive',
      primitive: {
        geometry: node.primitive.geometry,
        args: node.primitive.args ?? [],
      },
    }
  }
  return { kind: 'none' }
}

function getDefaultCollisionQuality(node, collision) {
  if (collision.quality) return collision.quality
  if (collision.shape === 'trimesh') return 'simplifiedMesh'
  if (collision.shape === 'cuboid' || collision.shape === 'cylinder') {
    return 'primitive'
  }
  if (node.asset?.url || node.prefab?.type) return 'simplifiedMesh'
  return 'primitive'
}

function getGeneratedCollisionShape({ node, collision, quality }) {
  if (collision.shape) return collision.shape
  if (quality === 'convexHull') return 'convexHull'
  if (quality === 'trimesh' || quality === 'simplifiedMesh') return 'trimesh'
  if (node.primitive?.geometry === 'cylinder') return 'cylinder'
  return 'cuboid'
}

function getCollisionTriangleBudget(collision) {
  return collision?.maxTriangles ?? collision?.triangleBudget
}

function getCollisionLodSourceTier(node, collision) {
  if (collision?.lodSourceTier) return collision.lodSourceTier
  if (collision?.lodTier) return collision.lodTier
  if (node.asset?.url || node.prefab?.type || collision?.colliderSourceAssetUrl) {
    return 'low'
  }
  return 'source'
}

export function getMeshCollisionPolicyDescriptor(node) {
  const collision = node.collision ?? {}
  const mode =
    collision.mode ??
    (collision.enabled === false || collision.intent === 'none'
      ? 'none'
      : collision.sensor || collision.intent === 'trigger'
        ? 'trigger'
        : 'auto')
  if (!node.collision || mode === 'none') {
    return { mode: 'none' }
  }
  const intent = mode === 'trigger' ? 'trigger' : collision.intent ?? 'blocker'
  const quality = getDefaultCollisionQuality(node, collision)
  const shape = getGeneratedCollisionShape({ node, collision, quality })
  return {
    mode,
    intent,
    channel:
      collision.channel ?? (intent === 'trigger' ? 'trigger' : 'worldStatic'),
    quality,
    shape,
    lodSourceTier: getCollisionLodSourceTier(node, collision),
    maxTriangles: getCollisionTriangleBudget(collision),
    friction: collision.friction,
    restitution: collision.restitution,
    sensor: collision.sensor,
  }
}

export function getMeshCollisionProductFingerprints(
  node,
  {
    publicRoot,
    resolvePrefabAssetUrl,
    generatorVersion = meshCollisionGeneratorVersion,
  } = {},
) {
  const source = getNodeSourceDescriptor(node, { resolvePrefabAssetUrl })
  const sourceMeshFingerprint =
    source.sourceMeshUrl && publicRoot
      ? fingerprintFile(
          resolvePublicAssetPath(publicRoot, source.sourceMeshUrl),
        )
      : fingerprintObject(source)
  const transformFingerprint = fingerprintObject({
    scale: node.scale ?? [1, 1, 1],
  })
  const policy = getMeshCollisionPolicyDescriptor(node)
  const policyFingerprint = fingerprintObject({
    ...policy,
    generatorVersion,
  })

  return {
    source,
    sourceMeshFingerprint,
    transformFingerprint,
    policy,
    policyFingerprint,
    generatorVersion,
  }
}

export function requiresGeneratedCollisionArtifact(
  node,
  { resolvePrefabAssetUrl } = {},
) {
  const collision = node.collision
  const policy = getMeshCollisionPolicyDescriptor(node)
  if (!collision || policy.mode === 'none') return false

  const source = getNodeSourceDescriptor(node, { resolvePrefabAssetUrl })
  const sourceRequiresArtifact =
    source.kind === 'asset' ||
    source.kind === 'prefab' ||
    source.kind === 'terrain'
  return (
    sourceRequiresArtifact &&
    (artifactBackedQualities.has(policy.quality) ||
      policy.shape === 'trimesh' ||
      policy.shape === 'convexHull')
  )
}

function fingerprintsMatch(left, right) {
  const leftValue = getFingerprintValue(left)
  const rightValue = getFingerprintValue(right)
  return (
    leftValue.length > 0 &&
    rightValue.length > 0 &&
    leftValue === rightValue &&
    (typeof left === 'string' ||
      typeof right === 'string' ||
      !left.algorithm ||
      !right.algorithm ||
      left.algorithm === right.algorithm)
  )
}

function getMetadataBounds(metadata, node) {
  const bounds =
    metadata?.colliderLocalBounds ??
    metadata?.bounds ??
    metadata?.assetLocalTransform?.colliderLocalBounds
  const normalizedBounds = normalizeBounds(bounds)
  if (normalizedBounds) return normalizedBounds
  const primitiveSize = getPrimitiveLocalSize(node.primitive)
  if (primitiveSize) return boundsFromSize(primitiveSize)
  const size = node.collision?.size ?? [1, 1, 1]
  return boundsFromSize(size)
}

function boundsFromSize(size) {
  const normalizedSize = isFiniteVec3(size)
    ? size.map(value => Math.abs(value))
    : [1, 1, 1]
  return {
    min: normalizedSize.map(value => -value / 2),
    max: normalizedSize.map(value => value / 2),
    size: normalizedSize,
    center: [0, 0, 0],
  }
}

function getPrimitiveLocalSize(primitive) {
  if (!primitive?.geometry) return null
  const args = Array.isArray(primitive.args) ? primitive.args : []

  if (primitive.geometry === 'box') {
    return [
      Math.abs(Number(args[0] ?? 1)) || 1,
      Math.abs(Number(args[1] ?? 1)) || 1,
      Math.abs(Number(args[2] ?? 1)) || 1,
    ]
  }
  if (primitive.geometry === 'cylinder') {
    const radiusTop = Math.abs(Number(args[0] ?? 0.5)) || 0.5
    const radiusBottom = Math.abs(Number(args[1] ?? 0.5)) || 0.5
    const height = Math.abs(Number(args[2] ?? 1)) || 1
    const diameter = Math.max(radiusTop, radiusBottom) * 2
    return [diameter, height, diameter]
  }
  if (
    ['octahedron', 'tetrahedron', 'icosahedron', 'dodecahedron'].includes(
      primitive.geometry,
    )
  ) {
    const radius = Math.abs(Number(args[0] ?? 0.5)) || 0.5
    const diameter = radius * 2
    return [diameter, diameter, diameter]
  }
  if (primitive.geometry === 'torus') {
    const radius = Math.abs(Number(args[0] ?? 0.5)) || 0.5
    const tube = Math.abs(Number(args[1] ?? 0.2)) || 0.2
    const diameter = (radius + tube) * 2
    return [diameter, tube * 2, diameter]
  }

  return null
}

export function createGeneratedCollisionProduct({
  levelId,
  node,
  publicRoot,
  metadata = null,
  resolvePrefabAssetUrl,
  generatorVersion = meshCollisionGeneratorVersion,
}) {
  const fingerprints = getMeshCollisionProductFingerprints(node, {
    publicRoot,
    resolvePrefabAssetUrl,
    generatorVersion,
  })
  const collision = node.collision ?? {}
  const quality = fingerprints.policy.quality ?? 'primitive'
  const artifactUrl = String(collision.colliderUrl ?? '').trim()
  const metadataUrl = getMeshCollisionMetadataUrl(collision)
  const product = {
    actorId: node.id,
    cacheKey:
      collision.colliderCacheKey ??
      `${generatorVersion}:${getFingerprintValue(fingerprints.sourceMeshFingerprint)}:${getFingerprintValue(fingerprints.transformFingerprint)}:${getFingerprintValue(fingerprints.policyFingerprint)}`,
    mode: fingerprints.policy.mode,
    productId: `${node.id}:${fingerprints.policy.mode}:${quality}`,
    generatorVersion,
    sourceKind: fingerprints.source.kind,
    sourceMeshFingerprint: fingerprints.sourceMeshFingerprint,
    transformFingerprint: fingerprints.transformFingerprint,
    policyFingerprint: fingerprints.policyFingerprint,
    shape: fingerprints.policy.shape,
    localBounds: getMetadataBounds(metadata, node),
  }
  if (artifactUrl) product.artifactUrl = artifactUrl
  if (metadataUrl) product.metadataUrl = metadataUrl
  if (fingerprints.source.sourceMeshUrl) {
    product.sourceMeshUrl = fingerprints.source.sourceMeshUrl
  }
  if (fingerprints.source.visualSourceMeshUrl) {
    product.visualSourceMeshUrl = fingerprints.source.visualSourceMeshUrl
  }
  const triangleCount = metadata?.triangleCount ?? collision.triangleCount
  if (triangleCount !== undefined) product.triangleCount = triangleCount
  const vertexCount = metadata?.vertexCount ?? collision.vertexCount
  if (vertexCount !== undefined) product.vertexCount = vertexCount
  const triangleBudget = getCollisionTriangleBudget(collision)
  if (triangleBudget !== undefined) product.triangleBudget = triangleBudget
  void levelId
  return product
}

export function readCollisionProductMetadata({ publicRoot, collision }) {
  const metadataUrl = getMeshCollisionMetadataUrl(collision)
  if (!metadataUrl) return null
  const metadataPath = resolvePublicAssetPath(publicRoot, metadataUrl)
  if (!existsSync(metadataPath)) return null
  return JSON.parse(readFileSync(metadataPath, 'utf8').replace(/^\uFEFF/, ''))
}

export function validateGeneratedCollisionProduct({
  levelId,
  node,
  publicRoot,
  resolvePrefabAssetUrl,
  requireCurrentMetadata = true,
}) {
  const errors = []
  const warnings = []
  const collision = node.collision
  const policy = getMeshCollisionPolicyDescriptor(node)
  if (!collision || policy.mode === 'none') {
    return { product: null, errors, warnings }
  }

  if (
    !requiresGeneratedCollisionArtifact(node, {
      resolvePrefabAssetUrl,
    })
  ) {
    let product = null
    try {
      product = createGeneratedCollisionProduct({
        levelId,
        node,
        publicRoot,
        resolvePrefabAssetUrl,
      })
      if (
        policy.quality !== 'primitive' &&
        !meshProductShapes.has(product.shape)
      ) {
        errors.push(
          `${node.id}: mesh-derived collision policy resolved placeholder product shape ${product.shape}.`,
        )
      }
    } catch (error) {
      errors.push(`${node.id}: ${error.message}`)
    }
    return {
      product,
      errors,
      warnings,
    }
  }

  const colliderUrl = String(collision.colliderUrl ?? '').trim()
  if (!colliderUrl) {
    errors.push(
      `${node.id}: mesh-derived collision is missing a generated artifact URL.`,
    )
    return { product: null, errors, warnings }
  }
  if (
    !colliderUrl.startsWith(generatedColliderRoot) &&
    !colliderUrl.startsWith(terrainColliderRoot)
  ) {
    errors.push(
      `${node.id}: generated collision artifact is outside the runtime collision roots.`,
    )
  }

  if (!publicRoot) {
    errors.push(
      `${node.id}: generated collision validation requires a public root.`,
    )
    return { product: null, errors, warnings }
  }

  const colliderPath = resolvePublicAssetPath(publicRoot, colliderUrl)
  if (!existsSync(colliderPath)) {
    errors.push(
      `${node.id}: generated collision artifact is missing: ${colliderUrl}`,
    )
  }

  const metadata = readCollisionProductMetadata({ publicRoot, collision })
  if (!metadata) {
    errors.push(`${node.id}: generated collision metadata is missing.`)
    return { product: null, errors, warnings }
  }
  const metadataBounds = normalizeBounds(
    metadata.colliderLocalBounds ??
      metadata.bounds ??
      metadata.assetLocalTransform?.colliderLocalBounds,
  )
  if (!metadataBounds) {
    errors.push(
      `${node.id}: generated collision metadata bounds are missing or invalid.`,
    )
  }
  if (!Number.isFinite(metadata.triangleCount)) {
    errors.push(
      `${node.id}: generated collision metadata triangle count is missing.`,
    )
  }
  if (!Number.isFinite(metadata.vertexCount)) {
    errors.push(
      `${node.id}: generated collision metadata vertex count is missing.`,
    )
  }

  let product = null
  try {
    product = createGeneratedCollisionProduct({
      levelId,
      node,
      publicRoot,
      metadata,
      resolvePrefabAssetUrl,
    })
  } catch (error) {
    errors.push(`${node.id}: ${error.message}`)
    return { product: null, errors, warnings }
  }
  const recordedProduct = metadata.collisionProduct
  if (product.shape !== policy.shape) {
    errors.push(
      `${node.id}: generated collision product shape ${product.shape} does not match policy shape ${policy.shape}.`,
    )
  }
  if (!meshProductShapes.has(product.shape)) {
    errors.push(
      `${node.id}: mesh-derived collision policy resolved placeholder product shape ${product.shape}.`,
    )
  }
  if (!product.artifactUrl) {
    errors.push(
      `${node.id}: generated collision product artifact URL is missing.`,
    )
  }
  if (!product.metadataUrl) {
    errors.push(
      `${node.id}: generated collision product metadata URL is missing.`,
    )
  }
  if (metadataBounds && !boundsMatch(product.localBounds, metadataBounds)) {
    errors.push(
      `${node.id}: generated collision product bounds do not match artifact metadata bounds.`,
    )
  }
  if (!Number.isFinite(product.triangleCount)) {
    errors.push(
      `${node.id}: generated collision product triangle count is missing.`,
    )
  }
  if (!Number.isFinite(product.vertexCount)) {
    errors.push(
      `${node.id}: generated collision product vertex count is missing.`,
    )
  }

  if (requireCurrentMetadata && !recordedProduct) {
    errors.push(
      `${node.id}: collider metadata predates Collision Manager products.`,
    )
  }
  if (metadata.sourceActorId && metadata.sourceActorId !== node.id) {
    errors.push(
      `${node.id}: collider metadata belongs to actor ${metadata.sourceActorId}.`,
    )
  }
  if (metadata.sourceLevelId && metadata.sourceLevelId !== levelId) {
    errors.push(
      `${node.id}: collider metadata belongs to level ${metadata.sourceLevelId}.`,
    )
  }
  const expectedVisualSourceUrl =
    product.visualSourceMeshUrl ?? product.sourceMeshUrl
  if (
    expectedVisualSourceUrl &&
    metadata.sourceAssetUrl &&
    metadata.sourceAssetUrl !== expectedVisualSourceUrl
  ) {
    errors.push(`${node.id}: collider metadata visual source mesh URL is stale.`)
  }
  if (
    product.sourceMeshUrl &&
    metadata.colliderSourceAssetUrl &&
    metadata.colliderSourceAssetUrl !== product.sourceMeshUrl
  ) {
    errors.push(`${node.id}: collider metadata collision source mesh URL is stale.`)
  }
  if (
    expectedVisualSourceUrl &&
    metadata.sourceAssetFingerprint &&
    publicRoot
  ) {
    try {
      const visualSourcePath = resolvePublicAssetPath(
        publicRoot,
        expectedVisualSourceUrl,
      )
      if (
        existsSync(visualSourcePath) &&
        !fingerprintsMatch(
          metadata.sourceAssetFingerprint,
          fingerprintFile(visualSourcePath),
        )
      ) {
        errors.push(
          `${node.id}: collider metadata visual source mesh fingerprint is stale.`,
        )
      }
    } catch (error) {
      errors.push(`${node.id}: ${error.message}`)
    }
  }
  if (
    requireCurrentMetadata &&
    metadata.colliderSourceAssetUrl &&
    !metadata.colliderSourceAssetFingerprint
  ) {
    errors.push(
      `${node.id}: collider metadata collision source mesh fingerprint is missing.`,
    )
  }
  if (
    recordedProduct?.sourceMeshUrl &&
    product.sourceMeshUrl &&
    recordedProduct.sourceMeshUrl !== product.sourceMeshUrl
  ) {
    errors.push(`${node.id}: generated collision source mesh URL is stale.`)
  }
  const colliderSourceFingerprint =
    metadata.colliderSourceAssetFingerprint ??
    (metadata.colliderSourceAssetUrl ? null : metadata.sourceAssetFingerprint)
  if (
    colliderSourceFingerprint &&
    !fingerprintsMatch(colliderSourceFingerprint, product.sourceMeshFingerprint)
  ) {
    errors.push(
      `${node.id}: collider metadata source mesh fingerprint is stale.`,
    )
  }

  if (recordedProduct) {
    const requiredFingerprints = [
      [
        'source mesh',
        recordedProduct.sourceMeshFingerprint,
        product.sourceMeshFingerprint,
      ],
      [
        'transform',
        recordedProduct.transformFingerprint,
        product.transformFingerprint,
      ],
      ['policy', recordedProduct.policyFingerprint, product.policyFingerprint],
    ]
    for (const [label, recorded, expected] of requiredFingerprints) {
      if (requireCurrentMetadata && !isFingerprintLike(recorded)) {
        errors.push(
          `${node.id}: generated collision ${label} fingerprint is missing.`,
        )
        continue
      }
      if (
        isFingerprintLike(recorded) &&
        !fingerprintsMatch(recorded, expected)
      ) {
        errors.push(
          `${node.id}: generated collision ${label} fingerprint is stale.`,
        )
      }
    }

    if (requireCurrentMetadata && !recordedProduct.generatorVersion) {
      errors.push(
        `${node.id}: generated collision product generator version is missing.`,
      )
    } else if (
      recordedProduct.generatorVersion &&
      recordedProduct.generatorVersion !== meshCollisionGeneratorVersion
    ) {
      errors.push(
        `${node.id}: generated collision product was made by ${recordedProduct.generatorVersion}.`,
      )
    }
    if (requireCurrentMetadata && !recordedProduct.artifactUrl) {
      errors.push(
        `${node.id}: generated collision product artifact URL is missing.`,
      )
    } else if (
      recordedProduct.artifactUrl &&
      recordedProduct.artifactUrl !== product.artifactUrl
    ) {
      errors.push(
        `${node.id}: generated collision product artifact URL is stale.`,
      )
    }
    if (requireCurrentMetadata && !recordedProduct.metadataUrl) {
      errors.push(
        `${node.id}: generated collision product metadata URL is missing.`,
      )
    } else if (
      recordedProduct.metadataUrl &&
      product.metadataUrl &&
      recordedProduct.metadataUrl !== product.metadataUrl
    ) {
      errors.push(
        `${node.id}: generated collision product metadata URL is stale.`,
      )
    }
    if (recordedProduct.shape && recordedProduct.shape !== product.shape) {
      errors.push(`${node.id}: generated collision product shape is stale.`)
    }
    if (requireCurrentMetadata && !isFiniteBounds(recordedProduct.localBounds)) {
      errors.push(
        `${node.id}: generated collision product bounds are missing or invalid.`,
      )
    } else if (
      recordedProduct.localBounds &&
      !boundsMatch(recordedProduct.localBounds, product.localBounds)
    ) {
      errors.push(`${node.id}: generated collision product bounds are stale.`)
    }
    if (
      requireCurrentMetadata &&
      !Number.isFinite(recordedProduct.triangleCount)
    ) {
      errors.push(
        `${node.id}: generated collision product triangle count is missing.`,
      )
    } else if (
      Number.isFinite(recordedProduct.triangleCount) &&
      Number.isFinite(product.triangleCount) &&
      recordedProduct.triangleCount !== product.triangleCount
    ) {
      errors.push(
        `${node.id}: generated collision product triangle count is stale.`,
      )
    }
    if (
      requireCurrentMetadata &&
      !Number.isFinite(recordedProduct.vertexCount)
    ) {
      errors.push(
        `${node.id}: generated collision product vertex count is missing.`,
      )
    } else if (
      Number.isFinite(recordedProduct.vertexCount) &&
      Number.isFinite(product.vertexCount) &&
      recordedProduct.vertexCount !== product.vertexCount
    ) {
      errors.push(`${node.id}: generated collision product vertex count is stale.`)
    }
  }
  const triangleBudget = getCollisionTriangleBudget(collision)
  if (
    Number.isFinite(triangleBudget) &&
    Number.isFinite(metadata.triangleCount) &&
    metadata.triangleCount > triangleBudget
  ) {
    warnings.push(
      `${node.id}: generated collision product has ${metadata.triangleCount} triangles, exceeding budget ${triangleBudget}.`,
    )
  }

  return { product, errors, warnings }
}
