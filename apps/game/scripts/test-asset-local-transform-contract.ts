import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import {
  applyAssetLocalMatrixToObject,
  applyAssetLocalMatrixToVertices,
  compareAssetLocalBounds,
  createIdentityAssetLocalTransformMetadata,
  getAssetLocalTransformStatus,
  validateAssetLocalTransformMetadata,
  type AssetLocalBounds,
  type AssetLocalMatrixTuple,
} from '../src/threlte/engine/assetLocalTransform'

const translatedMatrix: AssetLocalMatrixTuple = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  2, 3, 4, 1,
]

test('asset-local metadata distinguishes missing, identity, and non-identity states', () => {
  assert.equal(getAssetLocalTransformStatus(null), 'missing')

  const identity = createIdentityAssetLocalTransformMetadata({
    sourceAssetUrl: '/assets/source.glb',
  })
  assert.equal(getAssetLocalTransformStatus(identity), 'identity')

  assert.equal(
    getAssetLocalTransformStatus({
      ...identity,
      visualToPhysicsMatrix: translatedMatrix,
    }),
    'non-identity',
  )
})

test('asset-local metadata validation rejects non-finite matrix values', () => {
  const metadata = createIdentityAssetLocalTransformMetadata({
    sourceAssetUrl: '/assets/source.glb',
  })
  const badMatrix: AssetLocalMatrixTuple = [
    1, 0, 0, 0,
    0, Number.NaN, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]
  const result = validateAssetLocalTransformMetadata({
    ...metadata,
    visualToPhysicsMatrix: badMatrix,
  })

  assert.equal(result.valid, false)
  assert.equal(result.status, 'invalid')
  assert.match(result.errors.join('\n'), /16 finite numbers/)
})

test('asset-local bounds comparison uses tolerance without mounting a scene', () => {
  const visual: AssetLocalBounds = {
    min: [0, 0, 0],
    max: [2, 4, 6],
  }
  const closeCollider: AssetLocalBounds = {
    min: [0.01, 0, 0],
    max: [2.01, 4, 6],
  }
  const farCollider: AssetLocalBounds = {
    min: [0.2, 0, 0],
    max: [2.2, 4, 6],
  }

  assert.equal(compareAssetLocalBounds(visual, closeCollider, 0.02).matches, true)
  assert.equal(compareAssetLocalBounds(visual, farCollider, 0.02).matches, false)
})

test('asset-local matrix helper applies the same transform to objects and collider vertices', () => {
  const object = new THREE.Group()
  applyAssetLocalMatrixToObject(object, translatedMatrix)
  assert.deepEqual(object.position.toArray(), [2, 3, 4])

  const vertices = new Float32Array([0, 0, 0, 1, 1, 1])
  const transformed = applyAssetLocalMatrixToVertices(
    vertices,
    translatedMatrix,
    new Float32Array(vertices.length),
  )

  assert.deepEqual(Array.from(transformed), [2, 3, 4, 3, 4, 5])
  assert.deepEqual(Array.from(vertices), [0, 0, 0, 1, 1, 1])
})
