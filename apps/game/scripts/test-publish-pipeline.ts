import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeEditorPublishBakePlan,
  createEditorPublishBakePlanMetadataFromReadiness,
} from '../src/threlte/editor/editorPublishBakePlan.ts'
import type { EditorSceneDocument } from '../src/threlte/editor/editorTypes.ts'

const require = createRequire(import.meta.url)
const {
  handleSceneRoutes,
  normalizePublishBuildPlan,
  runPublishBuildPlan,
} = require('./editor-tools/sceneRoutes.cjs')

function createScene(
  overrides: Partial<EditorSceneDocument> = {},
): EditorSceneDocument {
  return {
    levelId: 'fixture-level',
    version: 1,
    updatedAt: '2026-05-12T00:00:00.000Z',
    nodes: [
      {
        id: 'fixture-asset',
        name: 'Fixture Asset',
        kind: 'asset',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: '/generated/runtime-game-assets/fixture.glb',
        },
      },
    ],
    settings: {
      level: {
        spawn: {
          position: [0, 1, 0],
          rotation: [0, 0, 0],
        },
      },
    },
    ...overrides,
  }
}

function createSpawnStub(
  failures: Partial<Record<string, { stdout?: string; stderr?: string }>> = {},
) {
  const calls: Array<{ command: string; args: string[] }> = []
  const spawnImpl = (command: string, args: string[]) => {
    calls.push({ command, args })
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()

    queueMicrotask(() => {
      const scriptName = args[2]
      const failure = failures[scriptName]
      if (failure) {
        if (failure.stdout) child.stdout.emit('data', failure.stdout)
        if (failure.stderr) child.stderr.emit('data', failure.stderr)
        child.emit('close', 1)
        return
      }
      child.stdout.emit('data', `${scriptName} ok\n`)
      child.emit('close', 0)
    })

    return child
  }

  return { calls, spawnImpl }
}

function createJsonRequest(pathname: string, payload: unknown) {
  const req = new EventEmitter() as EventEmitter & {
    method: string
    url: string
  }
  req.method = 'POST'
  req.url = pathname

  queueMicrotask(() => {
    req.emit('data', JSON.stringify(payload))
    req.emit('end')
  })

  return req
}

function createJsonResponse() {
  let resolveResponse:
    | ((value: { status: number; payload: Record<string, unknown> }) => void)
    | null = null
  const done = new Promise<{
    status: number
    payload: Record<string, unknown>
  }>(resolve => {
    resolveResponse = resolve
  })
  const res = {
    status: 200,
    writeHead(status: number) {
      this.status = status
    },
    end(body = '') {
      resolveResponse?.({
        status: this.status,
        payload: JSON.parse(String(body || '{}')),
      })
    },
  }

  return { done, res }
}

test('settings-only scenes are not publishable', () => {
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene: createScene({ nodes: [] }),
  })

  assert.match(plan.blockers.join('\n'), /cannot be published/)
})

test('populated scenes are publishable and always cook runtime assets', () => {
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene: createScene(),
  })

  assert.deepEqual(plan.steps, [
    'save-scene',
    'cook-runtime-assets',
    'audit-engine',
    'deploy-registry',
  ])
  assert.equal(plan.warnings.length, 0)
})

test('terrain dirty state includes terrain bake and chunk work', () => {
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene: createScene({
      settings: {
        level: {
          collision: {
            terrain: {
              source: 'baked-heightmap',
              manifestUrl: '/terrain/fixture-level.manifest.json',
              dirty: true,
            },
          },
          terrainSculpt: {
            enabled: true,
          },
        },
      },
    }),
  })

  assert.ok(plan.steps.includes('bake-terrain-collision'))
  assert.ok(plan.steps.includes('cook-terrain-chunks'))
})

test('world partition capability includes partition cook work', () => {
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene: createScene({
      settings: {
        level: {
          worldPartition: {
            partitionUrl: '/runtime-world-partitions/fixture.partition.json',
            dirty: true,
          },
        },
      },
    }),
  })

  assert.ok(plan.steps.includes('cook-world-partition'))
})

test('readiness metadata drives the same bake plan used by the publish button', () => {
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene: createScene({
      settings: {
        level: {
          collision: {
            terrain: {
              source: 'baked-heightmap',
              manifestUrl: '/terrain/fixture-level.manifest.json',
              colliderUrl: '/terrain/colliders/fixture-level.mmtc',
              metadataUrl: '/terrain/colliders/fixture-level.metadata.json',
              chunksPath: '/terrain/levels/fixture-level/',
              chunkCount: 48,
            },
          },
          terrainSculpt: {
            enabled: true,
          },
        },
      },
    }),
    metadata: createEditorPublishBakePlanMetadataFromReadiness({
      commands: [
        {
          id: 'cook-terrain-chunks',
          command: 'pnpm --dir apps/game cook:terrain-chunks',
          reason: 'Cook stale terrain visual chunks.',
        },
        {
          id: 'cook-runtime-assets',
          command: 'pnpm --dir apps/game cook:runtime-assets',
          reason: 'Refresh stale runtime manifests.',
        },
        {
          id: 'audit-engine',
          command: 'pnpm --dir apps/game audit:engine',
          reason: 'Verify publish contracts.',
        },
      ],
      sections: [
        {
          id: 'runtime-scene-manifest',
          label: 'Cooked Scene Manifest',
          severity: 'blocker',
          detail:
            'Authoring scene updatedAt does not match the cooked scene source.',
        },
        {
          id: 'terrain-collision',
          label: 'Collision And Ground',
          severity: 'warning',
          detail: 'Terrain manifest has no cooked visual chunks.',
        },
      ],
    }),
  })

  assert.ok(plan.steps.includes('cook-terrain-chunks'))
  assert.ok(plan.steps.includes('cook-runtime-assets'))
  assert.ok(plan.steps.includes('audit-engine'))
})

test('publish build plans cannot omit required runtime and audit steps', () => {
  assert.throws(
    () => normalizePublishBuildPlan({ steps: ['save-scene', 'audit-engine'] }),
    /cook-runtime-assets/,
  )
  assert.throws(
    () =>
      normalizePublishBuildPlan({
        steps: ['save-scene', 'cook-runtime-assets'],
      }),
    /audit-engine/,
  )
})

test('failed required publish build step stops the plan', async () => {
  const { calls, spawnImpl } = createSpawnStub({
    'cook:runtime-assets': {
      stderr: 'runtime cook failed',
    },
  })
  const result = await runPublishBuildPlan({
    levelId: 'fixture-level',
    repoRoot: process.cwd(),
    spawnImpl,
    plan: {
      steps: ['save-scene', 'cook-runtime-assets', 'audit-engine'],
    },
  })

  assert.equal(result.success, false)
  assert.equal(result.failedStep, 'cook-runtime-assets')
  assert.match(result.message, /runtime cook failed/)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].args[2], 'cook:runtime-assets')
})

test('publish build endpoint executes supported steps sequentially', async () => {
  const { calls, spawnImpl } = createSpawnStub()
  const route = {
    pathname: '/api/editor-scene/publish-build',
    parsedUrl: { query: {} },
  }
  const req = createJsonRequest(route.pathname, {
    levelId: 'fixture-level',
    plan: {
      steps: [
        'bake-terrain-collision',
        'cook-terrain-chunks',
        'cook-world-partition',
        'cook-runtime-assets',
        'audit-engine',
      ],
    },
  })
  const { done, res } = createJsonResponse()
  const handled = handleSceneRoutes(req, res, route, {
    REPO_ROOT: process.cwd(),
    spawnImpl,
  })
  const response = await done

  assert.equal(handled, true)
  assert.equal(response.status, 200)
  assert.equal(response.payload.success, true)
  assert.deepEqual(
    calls.map(call => call.args[2]),
    [
      'bake:terrain-collision',
      'cook:terrain-chunks',
      'cook:world-partition',
      'cook:runtime-assets',
      'audit:engine',
    ],
  )
  assert.deepEqual(
    (response.payload.steps as Array<{ id: string }>).map(step => step.id),
    [
      'bake-terrain-collision',
      'cook-terrain-chunks',
      'cook-world-partition',
      'cook-runtime-assets',
      'audit-engine',
    ],
  )
})

test('publish-build endpoint does not update registry after failed build', async () => {
  const { spawnImpl } = createSpawnStub({
    'cook:runtime-assets': {
      stderr: 'runtime cook failed',
    },
  })
  let registryWrites = 0
  const route = {
    pathname: '/api/editor-scene/publish-build',
    parsedUrl: { query: {} },
  }
  const req = createJsonRequest(route.pathname, {
    levelId: 'fixture-level',
    plan: {
      steps: ['save-scene', 'cook-runtime-assets', 'audit-engine'],
    },
  })
  const { done, res } = createJsonResponse()
  const handled = handleSceneRoutes(req, res, route, {
    REPO_ROOT: process.cwd(),
    spawnImpl,
    writeLevelRegistry: () => {
      registryWrites += 1
    },
  })
  const response = await done

  assert.equal(handled, true)
  assert.equal(response.status, 500)
  assert.equal(response.payload.success, false)
  assert.equal(response.payload.failedStep, 'cook-runtime-assets')
  assert.equal(registryWrites, 0)
})
