import assert from 'node:assert/strict'
import test from 'node:test'
import { applyDelta } from './import-blender-scene-delta.mjs'

function createScene() {
  return {
    levelId: 'fixture-level',
    version: 1,
    nodes: [
      {
        id: 'fixture-wall',
        name: 'Fixture Wall',
        kind: 'primitive',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        primitive: {
          geometry: 'box',
          args: [2, 3, 0.5],
          color: '#ffffff',
        },
        collision: {
          mode: 'auto',
          intent: 'blocker',
          channel: 'worldStatic',
          quality: 'primitive',
          friction: 0.7,
          restitution: 0,
        },
      },
    ],
  }
}

test('Blender scene delta applies simple collision proxy edits', () => {
  const { scene, updatedCount, unknownNodeIds } = applyDelta(createScene(), {
    schema: 'merkin.sceneDelta.v1',
    changes: [
      {
        nodeId: 'fixture-wall',
        position: [1, 2, 3],
        rotation: [0, 1.570796, 0],
        scale: [2, 1, 4],
        collision: {
          quality: 'convexHull',
          intent: 'trigger',
          channel: 'trigger',
          mode: 'trigger',
          sensor: true,
          friction: 0.25,
          restitution: 0.1,
        },
      },
    ],
  })

  const node = scene.nodes[0]
  assert.equal(updatedCount, 1)
  assert.deepEqual(unknownNodeIds, [])
  assert.deepEqual(node.position, [1, 2, 3])
  assert.deepEqual(node.rotation, [0, 1.570796, 0])
  assert.deepEqual(node.scale, [2, 1, 4])
  assert.deepEqual(node.collision, {
    mode: 'trigger',
    intent: 'trigger',
    channel: 'trigger',
    quality: 'convexHull',
    friction: 0.25,
    restitution: 0.1,
    sensor: true,
  })
})

test('Blender scene delta keeps existing collision when patch values are invalid', () => {
  const { scene } = applyDelta(createScene(), {
    schema: 'merkin.sceneDelta.v1',
    changes: [
      {
        nodeId: 'fixture-wall',
        collision: {
          shape: 'sphere',
          intent: 'invalid',
          channel: 'invalid',
          mode: 'invalid',
          quality: 'invalid',
        },
      },
    ],
  })

  assert.deepEqual(scene.nodes[0].collision, {
    mode: 'auto',
    intent: 'blocker',
    channel: 'worldStatic',
    quality: 'primitive',
    friction: 0.7,
    restitution: 0,
  })
})

test('Blender scene delta maps trimesh edits to collision policy', () => {
  const { scene } = applyDelta(createScene(), {
    schema: 'merkin.sceneDelta.v1',
    changes: [
      {
        nodeId: 'fixture-wall',
        collision: {
          shape: 'trimesh',
          intent: 'blocker',
          channel: 'worldStatic',
          triangleBudget: 500,
        },
      },
    ],
  })

  assert.deepEqual(scene.nodes[0].collision, {
    mode: 'auto',
    intent: 'blocker',
    channel: 'worldStatic',
    quality: 'simplifiedMesh',
    friction: 0.7,
    restitution: 0,
    maxTriangles: 500,
  })
})

test('Blender scene delta keeps collision patches policy-only', () => {
  const current = createScene()
  current.nodes[0].collision = {
    mode: 'auto',
    intent: 'blocker',
    channel: 'worldStatic',
    quality: 'trimesh',
    maxTriangles: 500,
  }

  const { scene } = applyDelta(current, {
    schema: 'merkin.sceneDelta.v1',
    changes: [
      {
        nodeId: 'fixture-wall',
        collision: {
          shape: 'cuboid',
          quality: 'primitive',
        },
      },
    ],
  })

  assert.deepEqual(scene.nodes[0].collision, {
    mode: 'auto',
    intent: 'blocker',
    channel: 'worldStatic',
    quality: 'primitive',
  })
})

test('Blender scene delta reports unknown collision proxy node ids', () => {
  const { updatedCount, unknownNodeIds } = applyDelta(createScene(), {
    schema: 'merkin.sceneDelta.v1',
    changes: [
      {
        nodeId: 'missing-node',
        collision: {
          shape: 'cuboid',
          size: [1, 1, 1],
        },
      },
    ],
  })

  assert.equal(updatedCount, 0)
  assert.deepEqual(unknownNodeIds, ['missing-node'])
})
