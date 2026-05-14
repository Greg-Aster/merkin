import assert from 'node:assert/strict'
import test from 'node:test'
import { applyCollisionLifecycleToPatch } from '../src/threlte/editor/editorCollisionLifecycle.ts'
import type { EditorSceneDocument } from '../src/threlte/editor/editorTypes.ts'

test('collision lifecycle invalidates variant asset changes before scale-only proxy resizing', () => {
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
      proxy: true,
      bakeStatus: 'needsBake',
      sourceAssetUrl: '/generated/style-lab/old.glb',
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

  assert.deepEqual(patch.collision?.size, [12, 3, 14])
  assert.equal(patch.collision?.proxy, true)
  assert.equal(patch.collision?.bakeStatus, 'needsBake')
  assert.equal(patch.collision?.sourceAssetUrl, '/generated/style-lab/new.glb')
})

test('collision lifecycle keeps scale-only edits resizing existing editor proxies', () => {
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
      proxy: true,
      bakeStatus: 'ready',
      sourceAssetUrl: '/generated/style-lab/asset.glb',
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    scale: [4, 1, 2],
  })

  assert.deepEqual(patch.collision?.size, [20, 2, 10])
  assert.equal(patch.collision?.bakeStatus, 'stale')
})
