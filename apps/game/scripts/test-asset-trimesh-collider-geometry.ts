import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { buildAssetTrimeshColliderPatches } from '../src/threlte/collision/assetTrimeshColliderGeometry'
import {
  compareAssetLocalBounds,
  createIdentityAssetLocalTransformMetadata,
  validateAssetLocalTransformMetadata,
} from '../src/threlte/engine/assetLocalTransform'

function triangleGeometry() {
  return new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      3,
    ),
  )
}

function roundedVertices(vertices: Float32Array) {
  return Array.from(vertices, value => Number(value.toFixed(4)))
}

test('asset trimesh collider vertices include the collider asset root transform', () => {
  const root = new THREE.Group()
  root.position.set(100, 0, 0)

  const mesh = new THREE.Mesh(triangleGeometry())
  mesh.name = 'transformed-mesh'
  mesh.position.set(2, 3, 4)
  mesh.scale.set(2, 3, 4)
  root.add(mesh)

  const [patch] = buildAssetTrimeshColliderPatches(root)

  assert.equal(patch.id, 'transformed-mesh-0')
  assert.deepEqual(Array.from(patch.indices), [0, 1, 2])
  assert.deepEqual(roundedVertices(patch.vertices), [
    102, 3, 4, 104, 3, 4, 102, 6, 4,
  ])
})

test('asset trimesh collider preserves nested scene graph transforms', () => {
  const root = new THREE.Group()
  const parent = new THREE.Group()
  parent.position.set(1, 0, 0)
  const mesh = new THREE.Mesh(triangleGeometry())
  mesh.name = 'nested-mesh'
  mesh.position.set(0, 2, 0)

  parent.add(mesh)
  root.add(parent)

  const [patch] = buildAssetTrimeshColliderPatches(root)

  assert.equal(patch.id, 'nested-mesh-0')
  assert.deepEqual(roundedVertices(patch.vertices), [
    1, 2, 0, 2, 2, 0, 1, 3, 0,
  ])
})

test('asset trimesh collider ignores external parent transforms', () => {
  const externalParent = new THREE.Group()
  externalParent.position.set(500, 0, 0)

  const root = new THREE.Group()
  root.position.set(100, 0, 0)
  const mesh = new THREE.Mesh(triangleGeometry())
  mesh.name = 'externally-parented-mesh'
  mesh.position.set(2, 3, 4)

  root.add(mesh)
  externalParent.add(root)

  const [patch] = buildAssetTrimeshColliderPatches(root)

  assert.equal(patch.id, 'externally-parented-mesh-0')
  assert.deepEqual(roundedVertices(patch.vertices), [
    102, 3, 4, 103, 3, 4, 102, 4, 4,
  ])
})

test('asset trimesh collider applies asset-local transform once to vertices', () => {
  const root = new THREE.Group()
  const mesh = new THREE.Mesh(triangleGeometry())
  mesh.name = 'asset-local-mesh'
  root.add(mesh)

  const [patch] = buildAssetTrimeshColliderPatches(root, {
    assetLocalTransform: {
      coordinateSpaceVersion: 1,
      sourceAssetUrl: '/fixture.glb',
      visualLocalBounds: null,
      colliderLocalBounds: null,
      visualToPhysicsLocalMatrix: new THREE.Matrix4()
        .makeTranslation(10, 0, 0)
        .toArray() as any,
    },
  })

  assert.deepEqual(roundedVertices(patch.vertices), [
    -10, 0, 0, -9, 0, 0, -10, 1, 0,
  ])
})

test('asset trimesh collider can bake actor scale into runtime vertices', () => {
  const root = new THREE.Group()
  const mesh = new THREE.Mesh(triangleGeometry())
  mesh.name = 'scaled-runtime-mesh'
  root.add(mesh)

  const [patch] = buildAssetTrimeshColliderPatches(root, {
    scale: [2, 3, 4],
  })

  assert.equal(patch.id, 'scaled-runtime-mesh-0')
  assert.deepEqual(roundedVertices(patch.vertices), [
    0, 0, 0, 2, 0, 0, 0, 3, 0,
  ])
})

test('asset-local transform metadata reports missing identity and invalid states', () => {
  assert.equal(validateAssetLocalTransformMetadata(null).state, 'missing')

  const identity = createIdentityAssetLocalTransformMetadata({
    sourceAssetUrl: '/fixture.glb',
  })
  assert.equal(validateAssetLocalTransformMetadata(identity).state, 'identity')

  const invalid = validateAssetLocalTransformMetadata({
    coordinateSpaceVersion: 1,
    sourceAssetUrl: '/fixture.glb',
    visualToPhysicsLocalMatrix: [Number.NaN],
  })
  assert.equal(invalid.state, 'malformed')
  assert.ok(invalid.errors.length > 0)
})

test('asset-local bounds comparison honors tolerance', () => {
  const visual = {
    min: [0, 0, 0] as [number, number, number],
    max: [1, 2, 3] as [number, number, number],
  }
  const collider = {
    min: [0.001, 0, 0] as [number, number, number],
    max: [1.001, 2, 3] as [number, number, number],
  }

  assert.equal(
    compareAssetLocalBounds({
      visualLocalBounds: visual,
      colliderLocalBounds: collider,
      tolerance: 0.002,
    }).withinTolerance,
    true,
  )
  assert.equal(
    compareAssetLocalBounds({
      visualLocalBounds: visual,
      colliderLocalBounds: collider,
      tolerance: 0.0001,
    }).withinTolerance,
    false,
  )
})
