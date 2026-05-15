import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateEditorSceneDocument,
} from '../src/threlte/editor/editorSceneDocumentValidation.ts'
import type { EditorSceneDocument } from '../src/threlte/editor/editorTypes.ts'
import { normalizeCollisionPolicy } from '../src/threlte/engine/collisionPolicy.ts'
import { adaptSceneDocumentToLevelDefinition } from '../src/threlte/engine/sceneAdapter.ts'
import {
  createRuntimeSceneManifest,
  validateRuntimeSceneManifest,
} from '../src/threlte/engine/runtimeSceneManifest.ts'
import {
  isGeneratedCollisionProductStale,
  type GeneratedCollisionProduct,
  type LevelBuildReport,
  type LevelDefinition,
} from '../src/threlte/engine/types.ts'

function createScene(
  collision: EditorSceneDocument['nodes'][number]['collision'],
): EditorSceneDocument {
  return {
    levelId: 'fixture-level',
    version: 1,
    updatedAt: '2026-05-14T00:00:00.000Z',
    nodes: [
      {
        id: 'fixture-mesh',
        name: 'Fixture Mesh',
        kind: 'asset',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: '/generated/runtime-game-assets/fixture-mesh.glb',
        },
        collision,
      },
    ],
    settings: {
      level: {
        spawn: {
          position: [0, 1, 0],
        },
      },
    },
  }
}

const generatedProduct: GeneratedCollisionProduct = {
  actorId: 'fixture-mesh',
  sourceMeshUrl: '/generated/runtime-game-assets/fixture-mesh.glb',
  sourceMeshFingerprint: 'source-a',
  transformFingerprint: 'transform-a',
  policyFingerprint: 'policy-a',
  shape: 'convexHull',
  artifactUrl:
    '/generated/runtime-game-assets/collision/fixture-mesh.collider.glb',
  metadataUrl:
    '/generated/runtime-game-assets/collision/fixture-mesh.collider.meta.json',
  localBounds: {
    min: [-1, 0, -1],
    max: [1, 2, 1],
    size: [2, 2, 2],
    center: [0, 1, 0],
  },
  triangleCount: 42,
  generatedAt: '2026-05-14T00:00:00.000Z',
  generatorVersion: 'fixture-generator-v1',
}

test('scene validation accepts authored mesh-derived collision policy modes', () => {
  assert.equal(
    validateEditorSceneDocument(
      createScene({
        mode: 'auto',
        intent: 'walkable',
        channel: 'worldStatic',
        quality: 'primitive',
        maxTriangles: 64,
      }),
    ).valid,
    true,
  )

  assert.equal(
    validateEditorSceneDocument(
      createScene({
        mode: 'none',
      }),
    ).valid,
    true,
  )
})

test('missing collision policy defaults to auto through normalization only', () => {
  assert.deepEqual(normalizeCollisionPolicy(undefined), { mode: 'auto' })
})

test('mesh-derived policy quality resolves runtime shape without legacy shape', () => {
  const level = adaptSceneDocumentToLevelDefinition(
    createScene({
      mode: 'auto',
      intent: 'blocker',
      channel: 'worldStatic',
      quality: 'simplifiedMesh',
      maxTriangles: 64,
    }),
  )

  assert.equal(level.actors[0].physics?.collision.shape, 'trimesh')
  assert.equal(level.actors[0].physics?.collision.quality, 'simplifiedMesh')
  assert.equal(level.actors[0].physics?.collision.triangleBudget, 64)
})

test('scene validation rejects legacy authored collider geometry fields', () => {
  const validation = validateEditorSceneDocument(
    createScene({
      mode: 'auto',
      enabled: true,
      size: [2, 2, 2],
      lockToObject: true,
      triangleBudget: 64,
    }),
  )

  assert.equal(validation.valid, false)
  assert.match(validation.errors.join('\n'), /collision\.enabled/)
  assert.match(validation.errors.join('\n'), /collision\.size/)
  assert.match(validation.errors.join('\n'), /collision\.lockToObject/)
  assert.match(validation.errors.join('\n'), /collision\.triangleBudget/)
})

test('scene validation accepts generated collision product metadata', () => {
  const validation = validateEditorSceneDocument(
    createScene({
      mode: 'auto',
      intent: 'blocker',
      channel: 'worldStatic',
      quality: 'simplifiedMesh',
      maxTriangles: 64,
      generationStatus: 'ready',
      shape: 'trimesh',
      colliderUrl:
        '/generated/runtime-game-assets/collision/fixture-mesh.collider.glb',
      colliderMetadataUrl:
        '/generated/runtime-game-assets/collision/fixture-mesh.collider.meta.json',
      colliderCacheKey: 'fixture-cache-key',
      sourceAssetUrl: '/generated/runtime-game-assets/fixture-mesh.glb',
      assetLocalTransform: null,
      triangleCount: 42,
      vertexCount: 24,
    }),
  )

  assert.equal(validation.valid, true)
})

test('scene validation rejects generated shape without product metadata', () => {
  const validation = validateEditorSceneDocument(
    createScene({
      mode: 'auto',
      shape: 'cuboid',
    }),
  )

  assert.equal(validation.valid, false)
  assert.match(validation.errors.join('\n'), /collision\.shape/)
})

test('scene validation rejects generated original collision source truth', () => {
  const scene = createScene({ mode: 'auto' })
  scene.nodes[0].generation = {
    originalCollision: {
      shape: 'cuboid',
      size: [1, 1, 1],
    },
  }

  const validation = validateEditorSceneDocument(scene)

  assert.equal(validation.valid, false)
  assert.match(validation.errors.join('\n'), /generation\.originalCollision/)
})

test('generated collision product stale checks compare all fingerprints', () => {
  assert.equal(
    isGeneratedCollisionProductStale(generatedProduct, {
      sourceMeshFingerprint: 'source-a',
      transformFingerprint: 'transform-a',
      policyFingerprint: 'policy-a',
    }),
    false,
  )

  assert.equal(
    isGeneratedCollisionProductStale(generatedProduct, {
      sourceMeshFingerprint: 'source-a',
      transformFingerprint: 'transform-b',
      policyFingerprint: 'policy-a',
    }),
    true,
  )
})

test('runtime scene manifest exposes generated collision products', () => {
  const level: LevelDefinition = {
    id: 'fixture-level',
    version: 1,
    spawn: {
      player: [0, 1, 0],
    },
    actors: [
      {
        id: 'fixture-mesh',
        name: 'Fixture Mesh',
        kind: 'asset',
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        render: {
          visible: true,
          cullingPolicy: 'runtime-budget',
          physicsAttachment: 'outside-collider',
          asset: {
            url: '/generated/runtime-game-assets/fixture-mesh.glb',
          },
        },
        physics: {
          bodyType: 'fixed',
          collision: {
            intent: 'blocker',
            channel: 'worldStatic',
            shape: 'trimesh',
            generatedProduct,
          },
        },
      },
    ],
  }
  const buildReport: LevelBuildReport = {
    levelId: 'fixture-level',
    actorCount: 1,
    assetActorCount: 1,
    primitiveActorCount: 0,
    neverCullActorCount: 0,
    gameplayFireflyActorCount: 0,
    physicsActorCount: 1,
    trimeshActorCount: 1,
    detailMeshActorCount: 0,
    defaultCollisionActorCount: 0,
    visualOnlyActorCount: 0,
    requiredActorCount: 0,
    missingRequiredActorIds: [],
    runtimeReadinessContract: {
      schemaVersion: 2,
      levelId: 'fixture-level',
      publish: {
        ready: true,
        gates: [],
        blockers: [],
      },
      runtime: {
        activationRequired: true,
        requiredGateIds: [],
        requiredRenderActorIds: [],
        requiredCollisionActorIds: [],
        requiredAssetUrls: [],
        requiredColliderUrls: [],
        requiredInitialCellKeys: [],
        requiredTerrain: false,
        terrainManifestUrl: '',
      },
      spawn: {
        player: [0, 1, 0],
        valid: true,
        runtimeActorId: 'fixture-level-player-spawn',
        satisfiedByRuntimeSystem: true,
      },
      terrain: {
        runtimeActorId: 'fixture-level-terrain',
        runtimeCollision: false,
        satisfiedByRuntimeSystem: true,
      },
      requiredActorIds: [],
      requiredWalkableActorIds: [],
      runtimeAssetUrls: [],
      missingRequiredActorIds: [],
      missingRequiredRenderActorIds: [],
      missingRequiredCollisionActorIds: [],
      missingRequiredWalkableActorIds: [],
    },
    collisionDiagnostics: {
      authoredActorIds: ['fixture-mesh'],
      defaultActorIds: [],
      visualOnlyActorIds: [],
      disabledActorIds: [],
      missingCollisionActorIds: [],
      collisionOnlyProxyActorIds: [],
    },
    errors: [],
    warnings: [],
  }

  const manifest = createRuntimeSceneManifest({
    scene: createScene({ mode: 'auto', quality: 'trimesh' }),
    sceneId: 'fixture-level',
    sourcePath: '/src/threlte/editor/scenes/fixture-level.scene.json',
    levelDefinition: level,
    buildReport,
  })

  assert.deepEqual(manifest.runtime.generatedCollisionProducts, [
    generatedProduct,
  ])

  const staleManifest = structuredClone(manifest) as typeof manifest
  delete (staleManifest.runtime.generatedCollisionProducts?.[0] as any)
    .generatedAt

  assert.equal(
    validateRuntimeSceneManifest(staleManifest).errors.some(error =>
      error.includes('generated collision product 0'),
    ),
    false,
  )

  const primitiveProxyManifest = structuredClone(manifest) as typeof manifest
  const primitiveProxyProduct = primitiveProxyManifest.runtime
    .generatedCollisionProducts?.[0] as any
  primitiveProxyProduct.shape = 'cuboid'
  primitiveProxyProduct.sourceKind = 'asset'
  delete primitiveProxyProduct.artifactUrl
  delete primitiveProxyProduct.metadataUrl
  const primitiveProxyCollision = primitiveProxyManifest.levelDefinition
    .actors[0].physics!.collision as any
  primitiveProxyCollision.quality = 'primitive'
  primitiveProxyCollision.shape = 'cuboid'
  primitiveProxyCollision.generatedProduct = primitiveProxyProduct

  const primitiveProxyErrors = validateRuntimeSceneManifest(
    primitiveProxyManifest,
  ).errors.join('\n')
  assert.doesNotMatch(primitiveProxyErrors, /cuboid shape for non-primitive/)
  assert.doesNotMatch(primitiveProxyErrors, /does not match primitive policy/)

  const placeholderManifest = structuredClone(manifest) as typeof manifest
  const placeholderProduct = placeholderManifest.runtime
    .generatedCollisionProducts?.[0] as any
  placeholderProduct.shape = 'cuboid'
  const placeholderCollision = placeholderManifest.levelDefinition.actors[0]
    .physics!.collision as any
  placeholderCollision.quality = 'simplifiedMesh'
  placeholderCollision.generatedProduct.shape = 'cuboid'

  assert.match(
    validateRuntimeSceneManifest(placeholderManifest).errors.join('\n'),
    /does not match simplifiedMesh policy/,
  )

  const missingProductManifest = structuredClone(manifest) as typeof manifest
  delete (missingProductManifest.levelDefinition.actors[0].physics!
    .collision as any).generatedProduct
  missingProductManifest.runtime.generatedCollisionProducts = []

  assert.match(
    validateRuntimeSceneManifest(missingProductManifest).errors.join('\n'),
    /generatedProduct is not mountable: generated collision product is missing/,
  )
})
