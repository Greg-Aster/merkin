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
          shape: 'cuboid',
          intent: 'blocker',
          channel: 'worldStatic',
          enabled: true,
          size: [2, 3, 0.5],
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
          shape: 'cylinder',
          intent: 'trigger',
          channel: 'trigger',
          enabled: true,
          sensor: true,
          friction: 0.25,
          restitution: 0.1,
          size: [4, 5, 6],
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
    shape: 'cylinder',
    intent: 'trigger',
    channel: 'trigger',
    enabled: true,
    size: [4, 5, 6],
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
          size: [-2, 0, Number.NaN],
        },
      },
    ],
  })

  assert.deepEqual(scene.nodes[0].collision, {
    shape: 'cuboid',
    intent: 'blocker',
    channel: 'worldStatic',
    enabled: true,
    size: [2, 3, 0.5],
    friction: 0.7,
    restitution: 0,
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
