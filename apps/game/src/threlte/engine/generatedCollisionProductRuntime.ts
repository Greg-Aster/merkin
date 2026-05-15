import type { GeneratedCollisionProduct, Vec3 } from './types'

export type RuntimeGeneratedShapeColliderShape =
  | 'cuboid'
  | 'cylinder'
  | 'ball'
  | 'capsule'

export type RuntimeGeneratedShapeColliderArgs =
  | [number, number, number]
  | [number, number]
  | [number]

const MIN_COLLIDER_SIZE = 0.05
const artifactBackedShapes = new Set(['trimesh', 'convexHull'])
const shapeBackedShapes = new Set(['cuboid', 'cylinder', 'ball', 'capsule'])

function isAbsolutePublicUrl(value: unknown) {
  return typeof value === 'string' && value.startsWith('/')
}

function isFiniteVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function clampColliderSize(value: number) {
  const size = Math.abs(Number(value))
  return Number.isFinite(size) ? Math.max(MIN_COLLIDER_SIZE, size) : 1
}

function getFingerprintValue(
  fingerprint: GeneratedCollisionProduct['sourceMeshFingerprint'],
) {
  return typeof fingerprint === 'string' ? fingerprint : fingerprint.value
}

export function isArtifactBackedGeneratedCollisionProduct(
  product: GeneratedCollisionProduct,
) {
  return artifactBackedShapes.has(product.shape) && Boolean(product.artifactUrl)
}

export function isShapeBackedGeneratedCollisionProduct(
  product: GeneratedCollisionProduct,
): product is GeneratedCollisionProduct & {
  shape: RuntimeGeneratedShapeColliderShape
} {
  return shapeBackedShapes.has(product.shape)
}

export function getGeneratedCollisionProductCacheKey(
  product: GeneratedCollisionProduct,
) {
  if (typeof product.cacheKey === 'string' && product.cacheKey.length > 0) {
    return product.cacheKey
  }

  return [
    product.generatorVersion,
    product.productId,
    getFingerprintValue(product.sourceMeshFingerprint),
    getFingerprintValue(product.transformFingerprint),
    getFingerprintValue(product.policyFingerprint),
  ]
    .filter(
      (part): part is string => typeof part === 'string' && part.length > 0,
    )
    .join(':')
}

export function getGeneratedCollisionProductShapeArgs(
  product: GeneratedCollisionProduct & {
    shape: RuntimeGeneratedShapeColliderShape
  },
): RuntimeGeneratedShapeColliderArgs {
  const size = product.localBounds.size.map(clampColliderSize) as Vec3
  const halfSize = [size[0] / 2, size[1] / 2, size[2] / 2] as Vec3

  if (product.shape === 'cylinder' || product.shape === 'capsule') {
    const radius = Math.max(halfSize[0], halfSize[2])
    return product.shape === 'capsule'
      ? [Math.max(0, halfSize[1] - radius), radius]
      : [halfSize[1], radius]
  }

  if (product.shape === 'ball') {
    return [Math.max(halfSize[0], halfSize[1], halfSize[2])]
  }

  return halfSize
}

export function getGeneratedCollisionProductShapePosition(
  product: GeneratedCollisionProduct,
): Vec3 | undefined {
  const center = product.localBounds?.center
  if (!isFiniteVec3(center) || center.every(component => component === 0)) {
    return undefined
  }
  return [center[0], center[1], center[2]]
}

export function getGeneratedCollisionProductMountError(
  product: GeneratedCollisionProduct | null | undefined,
  expectedActorId?: string,
) {
  if (!product) return 'generated collision product is missing.'
  if (expectedActorId && product.actorId !== expectedActorId) {
    return `generated collision product belongs to actor "${product.actorId}".`
  }
  if (!isFiniteVec3(product.localBounds?.size)) {
    return 'generated collision product localBounds.size must be a finite Vec3.'
  }

  if (artifactBackedShapes.has(product.shape)) {
    if (!isAbsolutePublicUrl(product.artifactUrl)) {
      return `generated ${product.shape} collision product is missing an absolute artifactUrl.`
    }
    if (!isAbsolutePublicUrl(product.metadataUrl)) {
      return `generated ${product.shape} collision product is missing an absolute metadataUrl.`
    }
    return ''
  }

  if (product.artifactUrl) {
    return `generated ${product.shape} collision product declares an artifactUrl but is not an artifact-backed shape.`
  }

  if (shapeBackedShapes.has(product.shape)) return ''

  return `generated collision shape "${product.shape}" is not mountable by the runtime adapter.`
}
