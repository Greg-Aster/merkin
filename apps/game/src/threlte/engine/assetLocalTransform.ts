import * as THREE from 'three'

import type { Vec3 } from './types'

export const ASSET_LOCAL_TRANSFORM_COORDINATE_SPACE_VERSION = 1
export const ASSET_LOCAL_TRANSFORM_IDENTITY_MATRIX = [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
] as const
export const ASSET_LOCAL_COORDINATE_SPACE_VERSION =
  ASSET_LOCAL_TRANSFORM_COORDINATE_SPACE_VERSION

export type Matrix4Tuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]
export type AssetLocalMatrixTuple = Matrix4Tuple
export type AssetLocalMatrix4 = Matrix4Tuple

export interface AssetLocalBounds {
  min: Vec3
  max: Vec3
  size?: Vec3
  center?: Vec3
}

export interface AssetLocalTransformMetadata {
  schemaVersion?: 1
  coordinateSpaceVersion: number
  sourceAssetUrl: string
  sourceNodeName?: string | null
  sourceMeshName?: string | null
  visualLocalBounds: AssetLocalBounds | null
  colliderLocalBounds: AssetLocalBounds | null
  visualToPhysicsMatrix: Matrix4Tuple
  visualToPhysicsLocalMatrix?: Matrix4Tuple
}

export type AssetLocalTransformState =
  | 'missing'
  | 'identity'
  | 'nonIdentity'
  | 'invalid'
  | 'malformed'

export interface AssetLocalTransformValidationResult {
  state: AssetLocalTransformState
  status?: 'missing' | 'identity' | 'non-identity' | 'invalid'
  valid: boolean
  errors: string[]
  metadata: AssetLocalTransformMetadata | null
}

export interface AssetLocalBoundsComparison {
  withinTolerance: boolean
  matches?: boolean
  maxDelta: number
  errors: string[]
}

function isFiniteVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  )
}

function isFiniteMatrix4(value: unknown): value is Matrix4Tuple {
  return (
    Array.isArray(value) &&
    value.length === 16 &&
    value.every(component => Number.isFinite(component))
  )
}

function isAssetLocalBounds(value: unknown): value is AssetLocalBounds {
  if (!value || typeof value !== 'object') return false
  const bounds = value as Partial<AssetLocalBounds>
  return isFiniteVec3(bounds.min) && isFiniteVec3(bounds.max)
}

function withDerivedBounds(bounds: AssetLocalBounds): AssetLocalBounds {
  const size =
    bounds.size ??
    (bounds.max.map((value, index) => value - bounds.min[index]) as Vec3)
  const center =
    bounds.center ??
    (bounds.min.map((value, index) => value + size[index] / 2) as Vec3)

  return {
    min: bounds.min,
    max: bounds.max,
    size,
    center,
  }
}

function toMatrix4Tuple(value: readonly number[]): Matrix4Tuple {
  return [...value] as Matrix4Tuple
}

function matrixFromTuple(matrix: Matrix4Tuple) {
  return new THREE.Matrix4().fromArray(matrix)
}

function getVisualToPhysicsMatrixTuple(
  metadata: AssetLocalTransformMetadata,
): Matrix4Tuple | null {
  const candidate =
    metadata.visualToPhysicsMatrix ?? metadata.visualToPhysicsLocalMatrix
  return isFiniteMatrix4(candidate) ? candidate : null
}

function getVisualToPhysicsMatrix(metadata: AssetLocalTransformMetadata) {
  const matrix = getVisualToPhysicsMatrixTuple(metadata)
  return matrix ? matrixFromTuple(matrix).invert() : null
}

function extractAssetLocalTransformMetadata(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  return record.assetLocalTransform ?? value
}

export function createIdentityAssetLocalTransformMetadata(input: {
  sourceAssetUrl: string
  sourceNodeName?: string | null
  sourceMeshName?: string | null
  visualLocalBounds?: AssetLocalBounds | null
  colliderLocalBounds?: AssetLocalBounds | null
}): AssetLocalTransformMetadata {
  return {
    schemaVersion: 1,
    coordinateSpaceVersion: ASSET_LOCAL_TRANSFORM_COORDINATE_SPACE_VERSION,
    sourceAssetUrl: input.sourceAssetUrl,
    sourceNodeName: input.sourceNodeName ?? null,
    sourceMeshName: input.sourceMeshName ?? null,
    visualLocalBounds: input.visualLocalBounds
      ? withDerivedBounds(input.visualLocalBounds)
      : null,
    colliderLocalBounds: input.colliderLocalBounds
      ? withDerivedBounds(input.colliderLocalBounds)
      : null,
    visualToPhysicsMatrix: toMatrix4Tuple(
      ASSET_LOCAL_TRANSFORM_IDENTITY_MATRIX,
    ),
    visualToPhysicsLocalMatrix: toMatrix4Tuple(
      ASSET_LOCAL_TRANSFORM_IDENTITY_MATRIX,
    ),
  }
}

export function validateAssetLocalTransformMetadata(
  value: unknown,
): AssetLocalTransformValidationResult {
  const extracted = extractAssetLocalTransformMetadata(value)
  if (extracted === null || extracted === undefined) {
    return {
      state: 'missing',
      status: 'missing',
      valid: false,
      errors: ['asset-local transform metadata is missing'],
      metadata: null,
    }
  }
  if (typeof extracted !== 'object') {
    return {
      state: 'malformed',
      status: 'invalid',
      valid: false,
      errors: ['asset-local transform metadata must be an object'],
      metadata: null,
    }
  }

  const candidate = extracted as Partial<AssetLocalTransformMetadata> & {
    visualToPhysicsLocalMatrix?: unknown
  }
  const matrix =
    candidate.visualToPhysicsMatrix ?? candidate.visualToPhysicsLocalMatrix
  const errors: string[] = []
  if (
    candidate.coordinateSpaceVersion !==
    ASSET_LOCAL_TRANSFORM_COORDINATE_SPACE_VERSION
  ) {
    errors.push(
      `coordinateSpaceVersion must be ${ASSET_LOCAL_TRANSFORM_COORDINATE_SPACE_VERSION}`,
    )
  }
  if (typeof candidate.sourceAssetUrl !== 'string') {
    errors.push('sourceAssetUrl must be a string')
  }
  if (!isFiniteMatrix4(matrix)) {
    errors.push('visualToPhysicsLocalMatrix must contain 16 finite numbers')
  }
  if (
    candidate.visualLocalBounds !== null &&
    candidate.visualLocalBounds !== undefined &&
    !isAssetLocalBounds(candidate.visualLocalBounds)
  ) {
    errors.push('visualLocalBounds must contain finite min and max Vec3 values')
  }
  if (
    candidate.colliderLocalBounds !== null &&
    candidate.colliderLocalBounds !== undefined &&
    !isAssetLocalBounds(candidate.colliderLocalBounds)
  ) {
    errors.push(
      'colliderLocalBounds must contain finite min and max Vec3 values',
    )
  }

  if (errors.length > 0 || !isFiniteMatrix4(matrix)) {
    return {
      state: 'malformed',
      status: 'invalid',
      valid: false,
      errors,
      metadata: null,
    }
  }

  const schemaVersion: 1 | undefined =
    candidate.schemaVersion === 1 ? 1 : undefined
  const metadata: AssetLocalTransformMetadata = {
    schemaVersion,
    coordinateSpaceVersion: candidate.coordinateSpaceVersion!,
    sourceAssetUrl: candidate.sourceAssetUrl!,
    sourceNodeName: candidate.sourceNodeName ?? null,
    sourceMeshName: candidate.sourceMeshName ?? null,
    visualLocalBounds: candidate.visualLocalBounds
      ? withDerivedBounds(candidate.visualLocalBounds)
      : null,
    colliderLocalBounds: candidate.colliderLocalBounds
      ? withDerivedBounds(candidate.colliderLocalBounds)
      : null,
    visualToPhysicsMatrix: matrix,
    visualToPhysicsLocalMatrix: matrix,
  }

  const state = isIdentityAssetLocalTransform(metadata)
    ? 'identity'
    : 'nonIdentity'

  return {
    state,
    status: state === 'nonIdentity' ? 'non-identity' : state,
    valid: true,
    errors: [],
    metadata,
  }
}

export function isIdentityAssetLocalTransform(
  metadata: AssetLocalTransformMetadata,
  tolerance = 0.000001,
) {
  const matrix = getVisualToPhysicsMatrixTuple(metadata)
  if (!matrix) return false
  return matrix.every(
    (value, index) =>
      Math.abs(value - ASSET_LOCAL_TRANSFORM_IDENTITY_MATRIX[index]) <=
      tolerance,
  )
}

export function getAssetLocalTransformStatus(
  value: unknown,
): 'missing' | 'identity' | 'non-identity' | 'invalid' {
  return validateAssetLocalTransformMetadata(value).status ?? 'invalid'
}

export function compareAssetLocalBounds(
  input:
    | {
        visualLocalBounds: AssetLocalBounds | null | undefined
        colliderLocalBounds: AssetLocalBounds | null | undefined
        tolerance?: number
      }
    | AssetLocalBounds
    | null
    | undefined,
  colliderLocalBounds?: AssetLocalBounds | null,
  positionalTolerance?: number,
): AssetLocalBoundsComparison {
  const normalized =
    input && 'visualLocalBounds' in input
      ? input
      : {
          visualLocalBounds: input as AssetLocalBounds | null | undefined,
          colliderLocalBounds,
          tolerance: positionalTolerance,
        }
  return compareAssetLocalBoundsInternal(normalized)
}

function compareAssetLocalBoundsInternal(input: {
  visualLocalBounds: AssetLocalBounds | null | undefined
  colliderLocalBounds: AssetLocalBounds | null | undefined
  tolerance?: number
}): AssetLocalBoundsComparison {
  const tolerance = input.tolerance ?? 0.05
  const errors: string[] = []
  const visualLocalBounds = input.visualLocalBounds
  const colliderLocalBounds = input.colliderLocalBounds
  if (!visualLocalBounds) errors.push('visual local bounds are missing')
  if (!colliderLocalBounds) errors.push('collider local bounds are missing')
  if (!visualLocalBounds || !colliderLocalBounds) {
    return {
      withinTolerance: false,
      matches: false,
      maxDelta: Number.POSITIVE_INFINITY,
      errors,
    }
  }

  let maxDelta = 0
  for (const key of ['min', 'max'] as const) {
    for (let index = 0; index < 3; index += 1) {
      maxDelta = Math.max(
        maxDelta,
        Math.abs(
          visualLocalBounds[key][index] - colliderLocalBounds[key][index],
        ),
      )
    }
  }

  return {
    withinTolerance: maxDelta <= tolerance,
    matches: maxDelta <= tolerance,
    maxDelta,
    errors:
      maxDelta <= tolerance ? [] : [`bounds drift ${maxDelta.toFixed(3)}`],
  }
}

export function applyAssetLocalTransformToVertices(
  vertices: Float32Array,
  metadata: AssetLocalTransformMetadata | null | undefined,
) {
  if (!metadata || isIdentityAssetLocalTransform(metadata)) return vertices

  const matrix = getVisualToPhysicsMatrix(metadata)
  if (!matrix) return vertices
  const transformed = new Float32Array(vertices.length)
  const vertex = new THREE.Vector3()
  for (let index = 0; index < vertices.length; index += 3) {
    vertex
      .set(vertices[index], vertices[index + 1], vertices[index + 2])
      .applyMatrix4(matrix)
    transformed[index] = vertex.x
    transformed[index + 1] = vertex.y
    transformed[index + 2] = vertex.z
  }
  return transformed
}

export function applyAssetLocalTransformToObject(
  object: THREE.Object3D,
  metadata: AssetLocalTransformMetadata | null | undefined,
) {
  if (!metadata || isIdentityAssetLocalTransform(metadata)) return object
  const matrix = getVisualToPhysicsMatrix(metadata)
  if (!matrix) return object
  object.applyMatrix4(matrix)
  object.updateWorldMatrix(true, true)
  return object
}

export function applyAssetLocalMatrixToVertices(
  vertices: Float32Array,
  matrix: Matrix4Tuple,
  target = new Float32Array(vertices.length),
) {
  const transform = matrixFromTuple(matrix)
  const vertex = new THREE.Vector3()
  for (let index = 0; index < vertices.length; index += 3) {
    vertex
      .set(vertices[index], vertices[index + 1], vertices[index + 2])
      .applyMatrix4(transform)
    target[index] = vertex.x
    target[index + 1] = vertex.y
    target[index + 2] = vertex.z
  }
  return target
}

export function applyAssetLocalMatrixToObject(
  object: THREE.Object3D,
  matrix: Matrix4Tuple,
) {
  object.applyMatrix4(matrixFromTuple(matrix))
  object.updateWorldMatrix(true, true)
  return object
}
