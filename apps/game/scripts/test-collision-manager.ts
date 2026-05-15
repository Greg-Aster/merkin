import assert from 'node:assert/strict'
import test from 'node:test'
import {
  type CollisionGenerationContext,
  type GeneratedCollisionProduct,
  createCollisionManager,
} from '../src/threlte/collision/CollisionManager.ts'

function createProduct(
  context: CollisionGenerationContext,
  generatedAt = '2026-05-14T00:00:00.000Z',
): GeneratedCollisionProduct {
  const isMeshDerived = context.policy.quality !== 'primitive'
  return {
    actorId: context.actor.id,
    cacheKey: context.cacheKey,
    sourceMeshUrl: context.sourceMeshUrl,
    sourceDescriptor: context.sourceDescriptor,
    sourceMeshFingerprint: context.sourceFingerprint,
    transformFingerprint: context.transformFingerprint,
    policyFingerprint: context.policyFingerprint,
    shape: context.policy.quality === 'primitive' ? 'cuboid' : 'trimesh',
    ...(isMeshDerived
      ? {
          artifactUrl: `/generated/runtime-game-assets/collision/test/${context.actor.id}.collider.glb`,
          metadataUrl: `/generated/runtime-game-assets/collision/test/${context.actor.id}.collider.meta.json`,
          triangleCount: context.policy.maxTriangles ?? 24,
          vertexCount: context.policy.maxTriangles ?? 16,
        }
      : {}),
    localBounds: {
      min: [-0.5, -0.5, -0.5],
      max: [0.5, 0.5, 0.5],
      size: [1, 1, 1],
      center: [0, 0, 0],
    },
    generatedAt,
    generatorVersion: context.generatorVersion,
  }
}

function createMeshActor(overrides = {}) {
  return {
    id: 'mesh-actor',
    renderSource: {
      kind: 'mesh' as const,
      url: '/assets/tree.glb',
      fingerprint: 'mesh-a',
    },
    transform: {
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
    },
    policy: {
      mode: 'auto' as const,
      quality: 'simplifiedMesh' as const,
    },
    ...overrides,
  }
}

test('mesh URL change creates a new generation key', () => {
  const manager = createCollisionManager({
    generator: context => createProduct(context),
  })

  manager.registerActor(createMeshActor())
  const initial = manager.getState('mesh-actor')
  assert.equal(initial?.status, 'ready')
  assert.ok(initial?.generationKey)

  manager.updateActor(
    createMeshActor({
      renderSource: {
        kind: 'mesh' as const,
        url: '/assets/rock.glb',
        fingerprint: 'mesh-b',
      },
    }),
  )

  const updated = manager.getState('mesh-actor')
  assert.equal(updated?.status, 'ready')
  assert.notEqual(updated?.generationKey, initial?.generationKey)
  assert.equal(updated?.product?.sourceMeshUrl, '/assets/rock.glb')
})

test('scale change dirties and regenerates through the manager', () => {
  let generations = 0
  const manager = createCollisionManager({
    generator: context => {
      generations += 1
      return createProduct(context)
    },
  })

  manager.registerActor(createMeshActor())
  const initial = manager.getState('mesh-actor')

  manager.updateActor(
    createMeshActor({
      transform: {
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [2, 1, 1] as [number, number, number],
      },
    }),
  )

  const updated = manager.getState('mesh-actor')
  assert.equal(generations, 2)
  assert.notEqual(updated?.generationKey, initial?.generationKey)
  assert.deepEqual(updated?.liveProduct?.transform.scale, [2, 1, 1])
})

test('mode none removes live and publish products from the active state', () => {
  const manager = createCollisionManager({
    generator: context => createProduct(context),
  })

  manager.registerActor(createMeshActor())
  assert.equal(manager.getPublishProducts().length, 1)

  manager.setPolicy('mesh-actor', { mode: 'none' })

  const disabled = manager.getState('mesh-actor')
  assert.equal(disabled?.status, 'disabled')
  assert.equal(disabled?.product, null)
  assert.equal(disabled?.liveProduct, null)
  assert.equal(manager.getPublishProducts().length, 0)
})

test('default generator fails mesh-derived products instead of publishing fake ready state', () => {
  const manager = createCollisionManager()

  manager.registerActor(createMeshActor())

  const state = manager.getState('mesh-actor')
  assert.equal(state?.status, 'failed')
  assert.match(
    state?.errors.join('\n') ?? '',
    /No collision product generator is configured/,
  )
  assert.equal(state?.product, null)
  assert.equal(state?.liveProduct, null)
  assert.equal(manager.getPublishProducts().length, 0)
})

test('manager rejects mesh-derived products that resolve to placeholder shapes', () => {
  const manager = createCollisionManager({
    generator: context => ({
      ...createProduct(context),
      shape: 'cuboid',
    }),
  })

  manager.registerActor(createMeshActor())

  const state = manager.getState('mesh-actor')
  assert.equal(state?.status, 'failed')
  assert.match(state?.errors.join('\n') ?? '', /does not match simplifiedMesh/)
  assert.equal(state?.product, null)
  assert.equal(manager.getPublishProducts().length, 0)
})

test('manager rejects mesh-derived products without artifact provenance', () => {
  const manager = createCollisionManager({
    generator: context => {
      const product = createProduct(context)
      delete product.artifactUrl
      delete product.metadataUrl
      return product
    },
  })

  manager.registerActor(createMeshActor())

  const state = manager.getState('mesh-actor')
  assert.equal(state?.status, 'failed')
  assert.match(state?.errors.join('\n') ?? '', /missing artifactUrl/)
  assert.match(state?.errors.join('\n') ?? '', /missing metadataUrl/)
  assert.equal(state?.product, null)
  assert.equal(manager.getPublishProducts().length, 0)
})

test('mode none cancels an in-flight generation result', async () => {
  let capturedContext: CollisionGenerationContext | null = null
  let resolveGeneration:
    | ((product: GeneratedCollisionProduct) => void)
    | undefined
  const manager = createCollisionManager({
    generator: context =>
      new Promise<GeneratedCollisionProduct>(resolve => {
        capturedContext = context
        resolveGeneration = resolve
      }),
  })

  manager.registerActor(createMeshActor())
  assert.equal(manager.getState('mesh-actor')?.status, 'generating')

  manager.setPolicy('mesh-actor', { mode: 'none' })
  assert.equal(manager.getState('mesh-actor')?.status, 'disabled')
  assert.equal(manager.getPublishProducts().length, 0)

  assert.ok(capturedContext)
  assert.ok(resolveGeneration)
  resolveGeneration(createProduct(capturedContext))
  await new Promise(resolve => setTimeout(resolve, 0))

  const state = manager.getState('mesh-actor')
  assert.equal(state?.status, 'disabled')
  assert.equal(state?.product, null)
  assert.equal(state?.liveProduct, null)
  assert.equal(manager.getPublishProducts().length, 0)
})

test('primitive args change regenerates the product', () => {
  let generations = 0
  const manager = createCollisionManager({
    generator: context => {
      generations += 1
      return createProduct(context)
    },
  })

  manager.registerActor({
    id: 'primitive-actor',
    renderSource: {
      kind: 'primitive',
      geometry: 'box',
      args: [1, 1, 1],
    },
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  })
  const initial = manager.getState('primitive-actor')

  manager.updateActor({
    id: 'primitive-actor',
    renderSource: {
      kind: 'primitive',
      geometry: 'box',
      args: [2, 1, 1],
    },
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  })

  const updated = manager.getState('primitive-actor')
  assert.equal(generations, 2)
  assert.notEqual(updated?.generationKey, initial?.generationKey)
})

test('unchanged actor does not regenerate needlessly', () => {
  let generations = 0
  const actor = createMeshActor()
  const manager = createCollisionManager({
    generator: context => {
      generations += 1
      return createProduct(context)
    },
  })

  manager.registerActor(actor)
  manager.updateActor(actor)

  assert.equal(generations, 1)
  assert.equal(manager.getState('mesh-actor')?.status, 'ready')
})

test('source fingerprint change rejects the stale product key', () => {
  const manager = createCollisionManager({
    generator: context => createProduct(context),
  })

  manager.registerActor(createMeshActor())
  const initial = manager.getState('mesh-actor')

  manager.updateActor(
    createMeshActor({
      renderSource: {
        kind: 'mesh' as const,
        url: '/assets/tree.glb',
        fingerprint: 'mesh-new-fingerprint',
      },
    }),
  )

  const updated = manager.getState('mesh-actor')
  assert.equal(updated?.status, 'ready')
  assert.notEqual(updated?.generationKey, initial?.generationKey)
  assert.equal(updated?.product?.sourceMeshFingerprint, 'mesh-new-fingerprint')
  assert.equal(
    manager.getPublishProducts()[0]?.cacheKey,
    updated?.generationKey,
  )
})
