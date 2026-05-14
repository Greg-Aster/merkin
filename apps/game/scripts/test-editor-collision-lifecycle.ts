import assert from 'node:assert/strict'
import test from 'node:test'
import {
  describeNodeCollisionSource,
  resolveNodeCollision,
} from '../src/threlte/editor/editorCollisionDefaults.ts'
import {
  applyCollisionLifecycleToPatch,
  materializeEditorNodeCollision,
  preserveCollisionForVisualReplacement,
} from '../src/threlte/editor/editorCollisionLifecycle.ts'
import { applyGeneratedAssetToNode } from '../src/threlte/editor/editorGeneratedAssetApplication.ts'
import { normalizeLevelSceneSettings } from '../src/threlte/editor/editorLevelSetup.ts'
import type {
  EditorSceneDocument,
  EditorSceneNode,
} from '../src/threlte/editor/editorTypes.ts'
import { reviewCollisionContracts } from '../src/threlte/engine/collisionReview.ts'

function createPrimitiveNode(
  overrides: Partial<EditorSceneNode> = {},
): EditorSceneNode {
  return {
    id: 'blockout-box',
    name: 'Blockout Box',
    kind: 'primitive',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    primitive: {
      geometry: 'box',
      args: [4, 2, 0.5],
    },
    ...overrides,
  }
}

test('primitive blockout creation authors explicit fixed collision by default', () => {
  const materialized = materializeEditorNodeCollision(createPrimitiveNode())

  assert.equal(materialized.physics?.bodyType, 'fixed')
  assert.equal(materialized.collision?.shape, 'cuboid')
  assert.equal(materialized.collision?.intent, 'blocker')
  assert.equal(materialized.collision?.channel, 'worldStatic')
  assert.equal(materialized.collision?.enabled, true)
  assert.deepEqual(materialized.collision?.size, [4, 2, 0.5])
})

test('primitive-only scene load materializes explicit collision when enabled', () => {
  const settings = normalizeLevelSceneSettings('fixture-level', {})
  const materialized = materializeEditorNodeCollision(
    createPrimitiveNode({ id: 'loaded-blockout-floor' }),
    settings,
  )

  assert.equal(
    settings.level?.collision?.defaults?.primitiveCollisionByDefault,
    true,
  )
  assert.equal(materialized.collision?.enabled, true)
  assert.equal(resolveNodeCollision(materialized, settings)?.intent, 'blocker')
})

test('primitive collision default can be disabled for authoring fixtures', () => {
  const settings = normalizeLevelSceneSettings('fixture-level', {
    level: {
      collision: {
        defaults: {
          primitiveCollisionByDefault: false,
        },
      },
    },
  })
  const materialized = materializeEditorNodeCollision(
    createPrimitiveNode({ id: 'visual-blockout-reference' }),
    settings,
  )

  assert.equal(materialized.collision, undefined)
  assert.equal(resolveNodeCollision(materialized, settings), null)
})

test('disabled primitive collision survives reload normalization', () => {
  const materialized = materializeEditorNodeCollision(
    createPrimitiveNode({
      collision: {
        shape: 'cuboid',
        intent: 'none',
        enabled: false,
      },
    }),
  )

  assert.equal(materialized.collision?.enabled, false)
  assert.equal(materialized.collision?.intent, 'none')
  assert.equal(resolveNodeCollision(materialized), null)
})

test('visual-only role wins over primitive default collision', () => {
  const settings = normalizeLevelSceneSettings('fixture-level', {
    level: {
      collision: {
        roles: {
          visualOnlyActorIds: ['visual-only-blockout'],
        },
      },
    },
  })
  const materialized = materializeEditorNodeCollision(
    createPrimitiveNode({ id: 'visual-only-blockout' }),
    settings,
  )

  assert.equal(materialized.collision, undefined)
  assert.equal(resolveNodeCollision(materialized, settings), null)
})

test('collision lifecycle preserves authored collision when visual asset changes', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'variant-asset',
    name: 'Variant Asset',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [2, 2, 2],
    visible: true,
    asset: {
      url: '/generated/style-lab/old.glb',
    },
    generation: {
      sourceVisualSize: [10, 4, 10],
    },
    collision: {
      shape: 'cuboid',
      intent: 'blocker',
      channel: 'worldStatic',
      enabled: true,
      size: [10, 4, 10],
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    asset: {
      url: '/generated/style-lab/new.glb',
    },
    scale: [5, 5, 5],
    generation: {
      sourceVisualSize: [12, 3, 14],
    },
  })

  assert.equal(patch.collision, undefined)
})

test('collision lifecycle does not rewrite authored collision on scale-only edits', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'scaled-asset',
    name: 'Scaled Asset',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [2, 2, 2],
    visible: true,
    asset: {
      url: '/generated/style-lab/asset.glb',
    },
    collision: {
      shape: 'cuboid',
      intent: 'blocker',
      channel: 'worldStatic',
      enabled: true,
      size: [10, 4, 10],
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    scale: [4, 1, 2],
  })

  assert.equal(patch.collision, undefined)
})

test('mesh assets without authored collision resolve no collider and report missing collision', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'mesh-without-collision',
    name: 'Mesh Without Collision',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: {
      url: '/generated/style-lab/mesh.glb',
    },
  }

  const effectiveCollision = resolveNodeCollision(currentNode)
  assert.equal(effectiveCollision, null)

  const status = describeNodeCollisionSource(currentNode)
  assert.equal(status.label, 'Missing collision')
  assert.equal(status.tone, 'warning')
  assert.match(status.detail, /no authored runtime collision/)
})

test('primitive visual replacement keeps authored cuboid blocker collision', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'blockout-wall',
    name: 'Blockout Wall',
    kind: 'primitive',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    primitive: {
      geometry: 'box',
      args: [4, 3, 0.4],
    },
    collision: {
      shape: 'cuboid',
      intent: 'blocker',
      channel: 'worldStatic',
      enabled: true,
      size: [4, 3, 0.4],
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    kind: 'asset',
    asset: { url: '/generated/runtime-game-assets/blockout-wall-final.glb' },
    primitive: undefined,
  })
  const nextNode = { ...currentNode, ...patch }

  assert.deepEqual(nextNode.collision, currentNode.collision)
})

test('primitive visual replacement keeps walkable collision intent', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'blockout-floor',
    name: 'Blockout Floor',
    kind: 'primitive',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    primitive: {
      geometry: 'box',
      args: [8, 0.5, 8],
    },
    collision: {
      shape: 'cuboid',
      intent: 'walkable',
      channel: 'worldStatic',
      enabled: true,
      size: [8, 0.5, 8],
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    kind: 'asset',
    asset: { url: '/generated/runtime-game-assets/blockout-floor-final.glb' },
    primitive: undefined,
  })
  const nextNode = { ...currentNode, ...patch }

  assert.equal(nextNode.collision?.intent, 'walkable')
  assert.deepEqual(nextNode.collision, currentNode.collision)
})

test('visual replacement keeps disabled collision disabled', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'disabled-prop',
    name: 'Disabled Prop',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: { url: '/generated/runtime-game-assets/old-prop.glb' },
    collision: {
      shape: 'cuboid',
      intent: 'none',
      channel: 'worldStatic',
      enabled: false,
      size: [2, 2, 2],
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    asset: { url: '/generated/runtime-game-assets/new-prop.glb' },
  })
  const nextNode = { ...currentNode, ...patch }

  assert.equal(nextNode.collision?.enabled, false)
  assert.deepEqual(nextNode.collision, currentNode.collision)
})

test('visual replacement keeps visual-only role without adding collision', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'visual-prop',
    name: 'Visual Prop',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: { url: '/generated/runtime-game-assets/old-visual.glb' },
  }
  const settings = normalizeLevelSceneSettings('fixture-level', {
    level: {
      collision: {
        roles: {
          visualOnlyActorIds: ['visual-prop'],
        },
      },
    },
  })

  const patch = applyCollisionLifecycleToPatch(
    currentNode,
    {
      asset: { url: '/generated/runtime-game-assets/new-visual.glb' },
    },
    settings,
  )
  const nextNode = { ...currentNode, ...patch }

  assert.equal(nextNode.collision, undefined)
  assert.equal(resolveNodeCollision(nextNode, settings), null)
})

test('primitive mesh conversion preserves collision world size when scale is baked', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'scaled-blockout',
    name: 'Scaled Blockout',
    kind: 'primitive',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [2, 3, 4],
    visible: true,
    primitive: {
      geometry: 'box',
      args: [1, 1, 1],
    },
    collision: {
      shape: 'cuboid',
      intent: 'blocker',
      channel: 'worldStatic',
      enabled: true,
    },
  }

  const collision = preserveCollisionForVisualReplacement(currentNode, {
    visualScaleBakedIntoMesh: true,
  })

  assert.deepEqual(collision?.size, [2, 3, 4])
  assert.equal(collision?.shape, 'cuboid')
})

test('generated AI replacement keeps authored collision through lifecycle', async () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'ai-target',
    name: 'AI Target',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: { url: '/generated/runtime-game-assets/old-ai-target.glb' },
    collision: {
      shape: 'cuboid',
      intent: 'blocker',
      channel: 'worldStatic',
      enabled: true,
      size: [3, 4, 5],
    },
  }
  let capturedPatch:
    | Parameters<typeof applyCollisionLifecycleToPatch>[1]
    | null = null

  await applyGeneratedAssetToNode(
    {
      getSceneNodeVisualBounds: async () => ({
        size: [3, 4, 5],
        maxDimension: 5,
      }),
      inspectGeneratedAssetBounds: async () => ({
        size: [1, 1, 1],
        maxDimension: 1,
      }),
      patchNode: (_nodeId, patch) => {
        capturedPatch = patch
      },
      appendPipelineLog: () => {},
      getNodeTransformSnapshot: () => ({
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      }),
    },
    currentNode,
    '/generated/runtime-game-assets/new-ai-target.glb',
    { descriptor: 'fixture target' },
  )

  assert.ok(capturedPatch)
  assert.equal(capturedPatch.collision, undefined)
  const patch = applyCollisionLifecycleToPatch(currentNode, capturedPatch)
  const nextNode = { ...currentNode, ...patch }
  assert.deepEqual(nextNode.collision, currentNode.collision)
})

test('collision review rows classify missing, visual-only, and collision-only actors', () => {
  const scene: EditorSceneDocument = {
    levelId: 'fixture-level',
    version: 1,
    updatedAt: '2026-05-14T00:00:00.000Z',
    settings: {
      level: {
        spawn: {
          position: [0, 1, 0],
        },
        collision: {
          roles: {
            visualOnlyActorIds: ['visual-only-statue'],
          },
        },
      },
    },
    nodes: [
      {
        id: 'missing-collision-mesh',
        name: 'Missing Collision Mesh',
        kind: 'asset',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: '/models/missing.glb',
        },
      },
      {
        id: 'visual-only-statue',
        name: 'Visual Only Statue',
        kind: 'asset',
        position: [3, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: '/models/statue.glb',
        },
      },
      {
        id: 'hidden-spawn-pad',
        name: 'Hidden Spawn Pad',
        kind: 'primitive',
        position: [0, -0.1, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: false,
        primitive: {
          geometry: 'box',
          args: [4, 0.2, 4],
          color: '#55e68a',
        },
        collision: {
          shape: 'cuboid',
          intent: 'walkable',
          channel: 'worldStatic',
          enabled: true,
          size: [4, 0.2, 4],
        },
      },
    ],
  }

  const report = reviewCollisionContracts({ scene })
  const rowById = new Map(report.actors.map(actor => [actor.actorId, actor]))

  assert.equal(
    rowById.get('missing-collision-mesh')?.status,
    'missingCollision',
  )
  assert.equal(rowById.get('visual-only-statue')?.status, 'visualOnly')
  assert.equal(rowById.get('hidden-spawn-pad')?.status, 'collisionOnly')
  assert.ok(
    report.findings.some(
      finding =>
        finding.code === 'unclassified-visible-geometry' &&
        finding.actorId === 'missing-collision-mesh',
    ),
  )
})
