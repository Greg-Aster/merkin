import assert from 'node:assert/strict'
import {
  createCollisionManagerRapierProduct,
  getCollisionProductMountKey,
  getRapierColliderDescriptor,
} from '../src/threlte/collision/collisionManagerProduct'
import type { GeneratedCollisionProduct } from '../src/threlte/engine/types'

function createProduct(
  overrides: Partial<GeneratedCollisionProduct> = {},
): GeneratedCollisionProduct {
  return {
    actorId: 'crate',
    cacheKey: 'crate:collision:v1',
    mode: 'auto',
    productId: 'crate:auto:primitive',
    sourceKind: 'primitive',
    sourceMeshFingerprint: 'source-a',
    transformFingerprint: 'transform-a',
    policyFingerprint: 'policy-a',
    shape: 'cuboid',
    localBounds: {
      min: [-1, -2, -3],
      max: [1, 2, 3],
      size: [2, 4, 6],
      center: [0, 0, 0],
    },
    generatedAt: '2026-05-14T00:00:00.000Z',
    generatorVersion: 'fixture-generator-v1',
    ...overrides,
  }
}

const cuboidProduct = createCollisionManagerRapierProduct({
  product: createProduct(),
  intent: 'blocker',
  channel: 'worldStatic',
  position: [10, 0, 5],
  rotation: [0, 0.5, 0],
  scale: [2, 1, 2],
})

assert(cuboidProduct)
assert.equal(cuboidProduct.source, 'collision-manager')
assert.deepEqual(cuboidProduct.body.position, [10, 0, 5])
assert.deepEqual(cuboidProduct.body.rotation, [0, 0.5, 0])
assert.deepEqual(cuboidProduct.body.scale, [2, 1, 2])
assert.equal(cuboidProduct.body.bodyType, 'fixed')

assert.deepEqual(getRapierColliderDescriptor(cuboidProduct), {
  kind: 'shape',
  shape: 'cuboid',
  args: [1, 2, 3],
  friction: 0.7,
  restitution: 0,
  sensor: false,
  collisionGroups: cuboidProduct.collider.collisionGroups,
})

const cylinderProduct = createCollisionManagerRapierProduct({
  product: createProduct({
    actorId: 'pillar',
    cacheKey: 'pillar:collision:v1',
    productId: 'pillar:auto:primitive',
    shape: 'cylinder',
    localBounds: {
      min: [-1.5, -4, -1.5],
      max: [1.5, 4, 1.5],
      size: [3, 8, 3],
      center: [0, 0, 0],
    },
  }),
  intent: 'walkable',
  channel: 'worldStatic',
})

assert(cylinderProduct)
assert.deepEqual(getRapierColliderDescriptor(cylinderProduct), {
  kind: 'shape',
  shape: 'cylinder',
  args: [4, 1.5],
  friction: 0.7,
  restitution: 0,
  sensor: false,
  collisionGroups: cylinderProduct.collider.collisionGroups,
})

const capsuleProduct = createCollisionManagerRapierProduct({
  product: createProduct({
    actorId: 'capsule-pillar',
    cacheKey: 'capsule-pillar:collision:v1',
    shape: 'capsule',
    localBounds: {
      min: [-1, -3, -1],
      max: [1, 3, 1],
      size: [2, 6, 2],
      center: [0.25, 0, 0],
    },
  }),
  intent: 'blocker',
  channel: 'worldStatic',
})

assert(capsuleProduct)
assert.deepEqual(getRapierColliderDescriptor(capsuleProduct), {
  kind: 'shape',
  shape: 'capsule',
  args: [2, 1],
  position: [0.25, 0, 0],
  friction: 0.7,
  restitution: 0,
  sensor: false,
  collisionGroups: capsuleProduct.collider.collisionGroups,
})

const ballProduct = createCollisionManagerRapierProduct({
  product: createProduct({
    actorId: 'round-trigger',
    cacheKey: 'round-trigger:collision:v1',
    shape: 'ball',
    localBounds: {
      min: [-2, -1, -1],
      max: [2, 1, 1],
      size: [4, 2, 2],
      center: [0, 0, 0],
    },
  }),
  intent: 'trigger',
  channel: 'trigger',
  sensor: true,
})

assert(ballProduct)
assert.deepEqual(getRapierColliderDescriptor(ballProduct), {
  kind: 'shape',
  shape: 'ball',
  args: [2],
  friction: 0.7,
  restitution: 0,
  sensor: true,
  collisionGroups: ballProduct.collider.collisionGroups,
})

const assetTrimeshProduct = createCollisionManagerRapierProduct({
  product: createProduct({
    actorId: 'tree',
    cacheKey: 'tree:collision:v1',
    productId: 'tree:auto:simplifiedMesh',
    sourceKind: 'asset',
    sourceMeshUrl: '/generated/runtime-game-assets/tree.glb',
    shape: 'trimesh',
    artifactUrl:
      '/generated/runtime-game-assets/collision/yggdrasil/tree.collider.glb',
    metadataUrl:
      '/generated/runtime-game-assets/collision/yggdrasil/tree.collider.meta.json',
  }),
  intent: 'blocker',
  channel: 'worldStatic',
  levelId: 'yggdrasil',
})

assert(assetTrimeshProduct)
assert.deepEqual(getRapierColliderDescriptor(assetTrimeshProduct), {
  kind: 'assetTrimesh',
  levelId: 'yggdrasil',
  url: '/generated/runtime-game-assets/collision/yggdrasil/tree.collider.glb',
  metadataUrl:
    '/generated/runtime-game-assets/collision/yggdrasil/tree.collider.meta.json',
  cacheKey: 'tree:collision:v1',
  assetLocalTransform: null,
  friction: 0.7,
  restitution: 0,
  sensor: false,
  collisionGroups: assetTrimeshProduct.collider.collisionGroups,
})

const convexHullProduct = createCollisionManagerRapierProduct({
  product: createProduct({
    actorId: 'rock',
    cacheKey: 'rock:collision:v1',
    productId: 'rock:auto:convexHull',
    sourceKind: 'asset',
    shape: 'convexHull',
    artifactUrl:
      '/generated/runtime-game-assets/collision/yggdrasil/rock.collider.glb',
    metadataUrl:
      '/generated/runtime-game-assets/collision/yggdrasil/rock.collider.meta.json',
  }),
  intent: 'walkable',
  channel: 'worldStatic',
  levelId: 'yggdrasil',
})

assert(convexHullProduct)
assert.deepEqual(getRapierColliderDescriptor(convexHullProduct), {
  kind: 'assetTrimesh',
  levelId: 'yggdrasil',
  url: '/generated/runtime-game-assets/collision/yggdrasil/rock.collider.glb',
  metadataUrl:
    '/generated/runtime-game-assets/collision/yggdrasil/rock.collider.meta.json',
  cacheKey: 'rock:collision:v1',
  assetLocalTransform: null,
  friction: 0.7,
  restitution: 0,
  sensor: false,
  collisionGroups: convexHullProduct.collider.collisionGroups,
})

assert.equal(
  createCollisionManagerRapierProduct({
    product: createProduct({
      actorId: 'primitive-platform',
      cacheKey: 'primitive-platform:collision:v1',
      productId: 'primitive-platform:auto:trimesh',
      sourceKind: 'primitive',
      shape: 'trimesh',
    }),
    intent: 'walkable',
    channel: 'worldStatic',
  }),
  null,
)

assert.equal(
  createCollisionManagerRapierProduct({
    product: null,
    intent: 'blocker',
    channel: 'worldStatic',
  }),
  null,
)

assert.equal(
  createCollisionManagerRapierProduct({
    product: createProduct(),
    expectedFingerprints: {
      sourceMeshFingerprint: 'source-a',
      transformFingerprint: 'transform-b',
      policyFingerprint: 'policy-a',
    },
    intent: 'blocker',
    channel: 'worldStatic',
  }),
  null,
)

const legacySceneCollisionInput = {
  product: null,
  intent: 'blocker',
  channel: 'worldStatic',
  shape: 'cuboid',
  args: [1, 2, 3],
  colliderUrl:
    '/generated/runtime-game-assets/collision/yggdrasil/tree.collider.glb',
}

assert.equal(
  createCollisionManagerRapierProduct(legacySceneCollisionInput as never),
  null,
)

const firstKey = getCollisionProductMountKey(cuboidProduct)
const changedProduct = {
  ...cuboidProduct,
  body: {
    ...cuboidProduct.body,
    scale: [3, 1, 2] as [number, number, number],
  },
}
assert.notEqual(getCollisionProductMountKey(changedProduct), firstKey)

console.log('collision manager product adapter tests passed')
