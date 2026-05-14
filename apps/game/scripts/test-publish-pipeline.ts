import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeEditorPublishBakePlan,
  createEditorPublishBakePlanMetadataFromReadiness,
} from '../src/threlte/editor/editorPublishBakePlan.ts'
import { buildEditorPublishReadinessViewModel } from '../src/threlte/editor/editorPublishReadiness.ts'
import {
  validateEditorSceneDocument,
  validatePublishableEditorSceneDocument,
} from '../src/threlte/editor/editorSceneDocumentValidation.ts'
import { getSceneTerrainRuntimeRequest } from '../src/threlte/levels/sceneTerrainRuntime.ts'
import {
  type TerrainManifest,
  validateTerrainManifestCollisionContract,
} from '../src/threlte/features/terrain/terrainManifest.ts'
import {
  describeEditorTerrainPipeline,
  planEditorTerrainBakeSteps,
} from '../src/threlte/editor/editorTerrainPipeline.ts'
import { createLevelBuildReport } from '../src/threlte/engine/levelValidation.ts'
import {
  classifyTerrainAuthority,
  getTerrainAuthorityDiagnostics,
} from '../src/threlte/engine/groundContract.ts'
import {
  applyTerrainChunkCookPayload,
  applyTerrainHeightmapPayload,
  buildTerrainChunkCookRequest,
  buildTerrainHeightmapRequest,
} from '../src/threlte/editor/editorTerrainPipelineRunner.ts'
import {
  applyCollisionLifecycleToPatch,
  materializeEditorNodeCollision,
} from '../src/threlte/editor/editorCollisionLifecycle.ts'
import { createGeneratedAssetNode } from '../src/threlte/editor/editorGeneratedAssetApplication.ts'
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

const fixtureBounds = {
  min: [0, 0, 0] as [number, number, number],
  max: [10, 2, 10] as [number, number, number],
}
const fixtureSourceFingerprint = {
  algorithm: 'sha256',
  value: 'a'.repeat(64),
}
const fixtureHeightmapFingerprint = {
  algorithm: 'sha256',
  value: 'b'.repeat(64),
}

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

test('editor validation allows generated variant proxy collision before publish bake', () => {
  const scene = createScene({
    nodes: [
      {
        id: 'variant-proxy',
        name: 'Variant Proxy',
        kind: 'asset',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: '/generated/hunyuan3d/root-mound/root-mound-generated.glb',
        },
        collision: {
          shape: 'cuboid',
          intent: 'blocker',
          channel: 'worldStatic',
          enabled: true,
          size: [10, 4, 10],
          proxy: true,
          bakeStatus: 'needsBake',
          sourceAssetUrl:
            '/generated/hunyuan3d/root-mound/root-mound-generated.glb',
        },
      },
    ],
  })

  const editorValidation = validateEditorSceneDocument(scene)
  assert.equal(
    editorValidation.errors.some(error =>
      error.includes('uses editor proxy collision'),
    ),
    false,
  )
  assert.ok(
    editorValidation.warnings.some(warning =>
      warning.includes('uses editor proxy collision'),
    ),
  )

  const publishValidation = validatePublishableEditorSceneDocument(scene)
  assert.equal(publishValidation.valid, false)
  assert.ok(
    publishValidation.errors.some(error =>
      error.includes('uses editor proxy collision'),
    ),
  )
})

test('collision lifecycle repairs stale baked mesh collision on scene load', () => {
  const node: EditorSceneDocument['nodes'][number] = {
    id: 'stale-mesh',
    name: 'Stale Mesh',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: {
      url: '/generated/hunyuan3d/root-mound/root-mound-generated.glb',
    },
    collision: {
      shape: 'trimesh',
      intent: 'blocker',
      channel: 'worldStatic',
      enabled: true,
      colliderUrl: '/generated/runtime-game-assets/collision/root-mound.glb',
      sourceAssetUrl: '/generated/style-lab/sources/root-mound/root-mound.glb',
    },
  }

  const materialized = materializeEditorNodeCollision(node)

  assert.equal(materialized.collision?.shape, 'cuboid')
  assert.equal(materialized.collision?.proxy, true)
  assert.equal(materialized.collision?.bakeStatus, 'needsBake')
  assert.equal(
    materialized.collision?.sourceAssetUrl,
    '/generated/hunyuan3d/root-mound/root-mound-generated.glb',
  )
})

test('generated asset add-to-scene records visual bounds for proxy sizing', async () => {
  let addedNode: EditorSceneDocument['nodes'][number] | null = null

  await createGeneratedAssetNode(
    {
      getSelectedNode: () => null,
      getEditorNodes: () => [],
      getDefaultStyleDescriptor: () => 'generated fixture',
      addNode: node => {
        addedNode = node as EditorSceneDocument['nodes'][number]
      },
      getActiveSceneLevelId: () => 'fixture-level',
      saveSceneDocumentToDisk: async () => ({}),
      getSceneNodeVisualBounds: async () => ({
        size: [1, 1, 1],
        maxDimension: 1,
      }),
      inspectGeneratedAssetBounds: async () => ({
        size: [4, 2, 6],
        maxDimension: 6,
      }),
      patchNode: () => {},
      appendPipelineLog: () => {},
      getNodeTransformSnapshot: () => null,
    },
    '/generated/hunyuan3d/fixture.glb',
    'Generated Fixture',
  )

  assert.deepEqual(addedNode?.generation?.sourceVisualSize, [4, 2, 6])
  assert.deepEqual(addedNode?.scale, [1, 1, 1])
})

test('terrain authority classifier flags scene-authored baked-heightfield mixed authority', () => {
  const level = {
    id: 'fixture-level',
    settings: {
      level: {
        ground: {
          mode: 'scene-authored',
          visualSource: 'scene-actors',
          terrainRuntimeMode: 'scene-authored',
          terrainVisualSource: 'scene-actors',
          collisionSource: 'baked-heightfield',
          fallbackSurfacePolicy: 'disabled',
          groundActorIds: ['fixture-ground'],
          terrainManifestUrl: '/terrain/fixture-level.manifest.json',
        },
        collision: {
          terrain: {
            source: 'baked-heightmap',
            runtimeMode: 'scene-authored',
            visualSource: 'none',
            fallbackSurfacePolicy: 'disabled',
            manifestUrl: '/terrain/fixture-level.manifest.json',
          },
        },
      },
    },
  }

  const authority = classifyTerrainAuthority(level)
  assert.equal(authority.mode, 'scene-authored')
  assert.equal(authority.visualSource, 'scene-actors')
  assert.equal(authority.collisionSource, 'baked-heightfield')
  assert.equal(authority.mixedAuthority, true)

  const diagnostics = getTerrainAuthorityDiagnostics(level)
  assert.ok(
    diagnostics.errors.some((error) =>
      error.includes('scene-authored terrain uses baked-heightfield collision'),
    ),
  )
  assert.equal(diagnostics.warnings.length, 0)
})

test('source GLB chunk ground is accepted by level validation', () => {
  const level = {
    id: 'fixture-level',
    version: 1,
    name: 'Fixture Level',
    spawn: {
      player: [0, 1, 0] as [number, number, number],
    },
    actors: [],
    settings: {
      level: {
        ground: {
          mode: 'terrain-chunks',
          visualSource: 'source-glb-chunks',
          terrainRuntimeMode: 'glb-chunk-terrain',
          terrainVisualSource: 'source-glb-chunks',
          collisionSource: 'source-linked-terrain-collision',
          fallbackSurfacePolicy: 'disabled',
          terrainManifestUrl: '/terrain/fixture-level.manifest.json',
          sourceAssetUrl: '/models/levels/fixture-level.glb',
          sourceAssetHash: fixtureSourceFingerprint.value,
        },
        collision: {
          terrain: {
            source: 'source-glb',
            runtimeMode: 'glb-chunk-terrain',
            visualSource: 'source-glb-chunks',
            fallbackSurfacePolicy: 'disabled',
            manifestUrl: '/terrain/fixture-level.manifest.json',
            sourceAssetUrl: '/models/levels/fixture-level.glb',
            sourceAssetHash: fixtureSourceFingerprint.value,
          },
        },
      },
    },
  }

  const report = createLevelBuildReport(level)
  assert.deepEqual(report.errors, [])
})

test('legacy terrain-chunks ground visual source is rejected', () => {
  const level = {
    id: 'fixture-level',
    version: 1,
    name: 'Fixture Level',
    spawn: {
      player: [0, 1, 0] as [number, number, number],
    },
    actors: [],
    settings: {
      level: {
        ground: {
          mode: 'terrain-chunks',
          visualSource: 'terrain-chunks',
          terrainRuntimeMode: 'glb-chunk-terrain',
          terrainVisualSource: 'source-glb-chunks',
          collisionSource: 'source-linked-terrain-collision',
          fallbackSurfacePolicy: 'disabled',
          terrainManifestUrl: '/terrain/fixture-level.manifest.json',
          sourceAssetUrl: '/models/levels/fixture-level.glb',
          sourceAssetHash: fixtureSourceFingerprint.value,
        },
        collision: {
          terrain: {
            source: 'source-glb',
            runtimeMode: 'glb-chunk-terrain',
            visualSource: 'source-glb-chunks',
            fallbackSurfacePolicy: 'disabled',
            manifestUrl: '/terrain/fixture-level.manifest.json',
            sourceAssetUrl: '/models/levels/fixture-level.glb',
            sourceAssetHash: fixtureSourceFingerprint.value,
          },
        },
      },
    },
  }

  const report = createLevelBuildReport(level)
  assert.ok(
    report.errors.some(error =>
      error.includes('ground.visualSource "terrain-chunks" is invalid'),
    ),
  )
})

test('scene-authored terrain ignores stale baked terrain product fields', () => {
  const scene = createScene({
    settings: {
      level: {
        ground: {
          mode: 'scene-authored',
          visualSource: 'scene-actors',
          terrainRuntimeMode: 'scene-authored',
          terrainVisualSource: 'scene-actors',
          collisionSource: 'scene-colliders',
          fallbackSurfacePolicy: 'disabled',
          groundActorIds: ['fixture-asset'],
        },
        collision: {
          terrain: {
            source: 'baked-heightmap',
            runtimeMode: 'scene-authored',
            visualSource: 'none',
            manifestUrl: '/terrain/obsolete-fixture.manifest.json',
            heightmapDirty: true,
            dirty: true,
          },
        },
      },
    },
  })
  const pipeline = describeEditorTerrainPipeline({ scene })
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene,
  })

  assert.equal(pipeline.mode, 'scene-authored')
  assert.equal(pipeline.hasHeightmap, false)
  assert.equal(pipeline.hasCollider, false)
  assert.equal(pipeline.commands.find(command => command.id === 'generate-heightmap')?.enabled, false)
  assert.equal(pipeline.commands.find(command => command.id === 'bake-terrain-collision')?.enabled, false)
  assert.equal(plan.steps.includes('generate-heightmap'), false)
  assert.equal(plan.steps.includes('bake-terrain-collision'), false)
  assert.equal(plan.steps.includes('cook-terrain-chunks'), false)
})

function createGlbTerrainManifest(
  collisionSourceContractOverrides: Record<string, unknown> = {},
): TerrainManifest {
  return {
    id: 'fixture-level',
    runtime: {
      mode: 'glb-chunk-terrain',
      visualSource: 'source-glb-chunks',
      fallbackSurfacePolicy: 'disabled',
    },
    assets: {
      heightmap: '/terrain/heightmaps/fixture-level_heightmap.png',
      chunksPath: '/terrain/levels/fixture-level/',
      sourceGlb: '/models/levels/fixture-level.glb',
    },
    visualChunks: {
      source: 'source-glb',
      chunkCount: 16,
      sourceContract: {
        schemaVersion: 1,
        terrainSourceType: 'glb-chunk-terrain',
        sourceAssetUrl: '/models/levels/fixture-level.glb',
        sourceAssetUrls: ['/models/levels/fixture-level.glb'],
        sourceAssetFingerprint: fixtureSourceFingerprint,
        sourceCoordinateSystem: 'three-y-up-xz-ground',
        sourceBounds: fixtureBounds,
        renderBakeMode: 'source-glb-chunk-mesh',
        collisionBakeMode: 'heightfield-projection',
        collisionCoverageBounds: fixtureBounds,
        role: 'walkable',
        vertexCount: 128,
        triangleCount: 64,
      },
    },
    collision: {
      terrain: {
        type: 'baked-terrain-mesh',
        authoredException: true,
        url: '/terrain/collision/fixture-level.collider.bin',
        metadataUrl: '/terrain/collision/fixture-level.collider.meta.json',
        vertexCount: 81,
        triangleCount: 128,
        colliderResolution: 9,
        sourceContract: {
          schemaVersion: 1,
          terrainSourceType: 'glb-chunk-terrain',
          sourceAssetUrl: '/models/levels/fixture-level.glb',
          sourceAssetUrls: ['/models/levels/fixture-level.glb'],
          authoredSourceAssetUrls: ['/models/levels/fixture-level.glb'],
          sourceAssetFingerprint: fixtureSourceFingerprint,
          sourceAssetFingerprints: [
            {
              url: '/models/levels/fixture-level.glb',
              fingerprint: fixtureSourceFingerprint,
            },
          ],
          heightmapUrl: '/terrain/heightmaps/fixture-level_heightmap.png',
          heightmapFingerprint: fixtureHeightmapFingerprint,
          sourceCoordinateSystem: 'three-y-up-xz-ground',
          sourceBounds: fixtureBounds,
          renderBakeMode: 'source-glb-chunk-mesh',
          collisionBakeMode: 'heightfield-projection',
          collisionMeshSource: {
            type: 'heightmap',
            url: '/terrain/heightmaps/fixture-level_heightmap.png',
            fingerprint: fixtureHeightmapFingerprint,
          },
          collisionCoverageBounds: fixtureBounds,
          role: 'walkable',
          vertexCount: 81,
          triangleCount: 128,
          approvedHeightfieldException: true,
          ...collisionSourceContractOverrides,
        },
      },
    },
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
  }>((resolve) => {
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

test('source GLB terrain schedules GLB chunk cook before runtime assets', () => {
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene: createScene({
      settings: {
        level: {
          collision: {
            terrain: {
              runtimeMode: 'glb-chunk-terrain',
              visualSource: 'source-glb-chunks',
              manifestUrl: '/terrain/fixture-level.manifest.json',
              sourceAssetUrl: '/models/levels/fixture-level.glb',
              dirty: true,
            },
          },
          ground: {
            mode: 'terrain-chunks',
            terrainRuntimeMode: 'glb-chunk-terrain',
            terrainVisualSource: 'source-glb-chunks',
          },
        },
      },
    }),
  })

  assert.ok(plan.steps.includes('cook-terrain-glb-chunks'))
  assert.equal(plan.steps.includes('cook-terrain-chunks'), false)
  assert.ok(
    plan.steps.indexOf('cook-terrain-glb-chunks') <
      plan.steps.indexOf('cook-runtime-assets'),
  )
  assert.equal(plan.blockers.length, 0)
})

test('source GLB terrain editor status exposes the GLB chunk cook command', () => {
  const pipeline = describeEditorTerrainPipeline({
    scene: createScene({
      settings: {
        level: {
          collision: {
            terrain: {
              runtimeMode: 'glb-chunk-terrain',
              visualSource: 'source-glb-chunks',
              manifestUrl: '/terrain/fixture-level.manifest.json',
              sourceAssetUrl: '/models/levels/fixture-level.glb',
            },
          },
          ground: {
            mode: 'terrain-chunks',
            terrainRuntimeMode: 'glb-chunk-terrain',
            terrainVisualSource: 'source-glb-chunks',
          },
        },
      },
    }),
  })

  const command = pipeline.commands.find(
    (item) => item.id === 'cook-glb-chunks',
  )

  assert.equal(pipeline.mode, 'glb-chunk-terrain')
  assert.equal(command?.enabled, true)
  assert.equal(pipeline.blockers.length, 0)
  assert.match(command?.reason ?? '', /Cook render chunks directly/)
})

test('missing source GLB disables editor terrain bake and chunk cook commands', () => {
  const pipeline = describeEditorTerrainPipeline({
    scene: createScene({
      settings: {
        level: {
          collision: {
            terrain: {
              runtimeMode: 'glb-chunk-terrain',
              visualSource: 'source-glb-chunks',
              sourceAssetUrl: '/models/levels/missing-fixture.glb',
            },
          },
          ground: {
            terrainRuntimeMode: 'glb-chunk-terrain',
            terrainVisualSource: 'source-glb-chunks',
          },
        },
      },
    }),
    terrainStatus: {
      sourceAssets: [
        {
          sourceType: 'asset',
          url: '/models/levels/missing-fixture.glb',
          exists: false,
        },
      ],
    },
  })

  const bakeCommand = pipeline.commands.find(item => item.id === 'bake-terrain')
  const cookCommand = pipeline.commands.find(item => item.id === 'cook-glb-chunks')

  assert.equal(bakeCommand?.enabled, false)
  assert.equal(cookCommand?.enabled, false)
  assert.match(pipeline.sourceExistenceStatus.detail, /Source asset missing/)
  assert.match(pipeline.blockers.join('\n'), /Source asset missing/)
})

test('primitive terrain source stays valid without an external source asset', () => {
  const pipeline = describeEditorTerrainPipeline({
    scene: createScene({
      nodes: [
        {
          id: 'terrain-plane',
          name: 'Terrain Plane',
          kind: 'primitive',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          primitive: {
            geometry: 'box',
            args: [1, 1, 1],
            color: '#888888',
          },
        },
      ],
      settings: {
        level: {
          collision: {
            terrain: {
              source: 'baked-heightmap',
              sourceNodeIds: ['terrain-plane'],
              heightmapDirty: true,
              colliderUrl: '/terrain/colliders/fixture.mmtc',
              metadataUrl: '/terrain/colliders/fixture.metadata.json',
            },
          },
        },
      },
    }),
    terrainStatus: {
      sourceAssets: [
        {
          nodeId: 'terrain-plane',
          sourceType: 'primitive',
          sourceName: 'Terrain Plane',
          exists: true,
        },
      ],
    },
    selectedTerrainSourceAssetUrl: 'procedural-terrain-sources',
  })

  const generateCommand = pipeline.commands.find(
    item => item.id === 'generate-heightmap',
  )

  assert.equal(generateCommand?.enabled, true)
  assert.deepEqual(pipeline.sourceGlbUrls, [])
  assert.equal(pipeline.sourceExistenceStatus.state, 'ready')
})

test('source existence status only trusts the recorded GLB URL', () => {
  const pipeline = describeEditorTerrainPipeline({
    scene: createScene({
      settings: {
        level: {
          collision: {
            terrain: {
              runtimeMode: 'glb-chunk-terrain',
              visualSource: 'source-glb-chunks',
              sourceAssetUrl: '/models/levels/fixture-level.glb',
            },
          },
          ground: {
            terrainRuntimeMode: 'glb-chunk-terrain',
            terrainVisualSource: 'source-glb-chunks',
          },
        },
      },
    }),
    terrainStatus: {
      sourceAssets: [
        {
          sourceType: 'asset',
          url: '/models/levels/other-level.glb',
          exists: true,
        },
      ],
    },
  })

  assert.equal(pipeline.sourceExistenceStatus.state, 'warning')
  assert.match(
    pipeline.sourceExistenceStatus.detail,
    /source existence has not been checked/,
  )
})

test('publish readiness blocks GLB terrain when the recorded source asset is missing', () => {
  const scene = createScene({
    settings: {
      level: {
        spawn: {
          position: [0, 1, 0],
          rotation: [0, 0, 0],
        },
        collision: {
          terrain: {
            source: 'baked-heightmap',
            runtimeMode: 'glb-chunk-terrain',
            visualSource: 'source-glb-chunks',
            manifestUrl: '/terrain/fixture-level.manifest.json',
            sourceAssetUrl: '/models/levels/missing-fixture.glb',
          },
        },
        ground: {
          mode: 'terrain-chunks',
          visualSource: 'source-glb-chunks',
          terrainRuntimeMode: 'glb-chunk-terrain',
          terrainVisualSource: 'source-glb-chunks',
          collisionSource: 'source-linked-terrain-collision',
          fallbackSurfacePolicy: 'disabled',
          terrainManifestUrl: '/terrain/fixture-level.manifest.json',
        },
      },
    },
  })
  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: 'fixture-level',
    scene,
    runtimeAssetManifest: null,
    runtimeScene: null,
    prefabManifest: null,
    terrainManifest: null,
    missingTerrainSourceAssets: [
      {
        sourceType: 'asset',
        url: '/models/levels/missing-fixture.glb',
        exists: false,
      },
    ],
  })
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene,
    metadata: createEditorPublishBakePlanMetadataFromReadiness(viewModel),
  })

  assert.match(
    viewModel.blockers.map(item => item.detail).join('\n'),
    /Source asset missing/,
  )
  assert.match(plan.blockers.join('\n'), /Source asset missing/)
})

test('source GLB terrain settings request scene terrain runtime loading', () => {
  const scene = createScene({
    settings: {
      level: {
        collision: {
          terrain: {
            source: 'source-glb',
            runtimeSource: 'built-in-manifest',
            manifestUrl: '/terrain/fixture-level.manifest.json',
            runtimeMode: 'glb-chunk-terrain',
            visualSource: 'source-glb-chunks',
          },
        },
      },
    },
  })

  assert.deepEqual(getSceneTerrainRuntimeRequest(scene.settings), {
    manifestUrl: '/terrain/fixture-level.manifest.json',
    source: 'built-in-manifest',
  })
})

test('GLB terrain collision contract accepts matching source-derived provenance', () => {
  const diagnostics = validateTerrainManifestCollisionContract({
    manifest: createGlbTerrainManifest(),
    levelId: 'fixture-level',
    spawnPoint: [5, 1, 5],
  })

  assert.deepEqual(diagnostics.errors, [])
})

test('GLB terrain collision contract requires render source hash provenance', () => {
  const diagnostics = validateTerrainManifestCollisionContract({
    manifest: createGlbTerrainManifest({
      sourceAssetUrl: '/terrain/heightmaps/fixture-level_heightmap.png',
      sourceAssetUrls: [
        '/terrain/heightmaps/fixture-level_heightmap.png',
        '/models/levels/fixture-level.glb',
      ],
      authoredSourceAssetUrls: ['/models/levels/fixture-level.glb'],
      sourceAssetFingerprint: fixtureHeightmapFingerprint,
      sourceAssetFingerprints: [],
    }),
    levelId: 'fixture-level',
    spawnPoint: [5, 1, 5],
  })

  assert.match(
    diagnostics.errors.join('\n'),
    /collision must record the render chunk source hash/,
  )
})

test('GLB terrain collision contract rejects mismatched source hashes', () => {
  const diagnostics = validateTerrainManifestCollisionContract({
    manifest: createGlbTerrainManifest({
      sourceAssetFingerprint: {
        algorithm: 'sha256',
        value: 'c'.repeat(64),
      },
      sourceAssetFingerprints: [
        {
          url: '/models/levels/fixture-level.glb',
          fingerprint: {
            algorithm: 'sha256',
            value: 'c'.repeat(64),
          },
        },
      ],
    }),
    levelId: 'fixture-level',
    spawnPoint: [5, 1, 5],
  })

  assert.match(
    diagnostics.errors.join('\n'),
    /collision source hash does not match render chunk source hash/,
  )
})

test('source GLB terrain bake flow cooks chunks before validation', () => {
  const pipeline = describeEditorTerrainPipeline({
    scene: createScene({
      settings: {
        level: {
          collision: {
            terrain: {
              runtimeMode: 'glb-chunk-terrain',
              visualSource: 'source-glb-chunks',
              manifestUrl: '/terrain/fixture-level.manifest.json',
              sourceAssetUrl: '/models/levels/fixture-level.glb',
            },
          },
          ground: {
            mode: 'terrain-chunks',
            terrainRuntimeMode: 'glb-chunk-terrain',
            terrainVisualSource: 'source-glb-chunks',
          },
        },
      },
    }),
  })

  assert.deepEqual(
    planEditorTerrainBakeSteps({
      pipeline,
      terrain: {},
    }),
    ['source-glb-chunks', 'collision', 'validation'],
  )
})

test('editor terrain bake planner keeps terrain modes explicit', () => {
  assert.deepEqual(
    planEditorTerrainBakeSteps({
      pipeline: {
        mode: 'scene-authored',
        hasHeightmap: false,
        hasCollider: false,
        hasSource: false,
      },
    }),
    ['validation'],
  )
  assert.deepEqual(
    planEditorTerrainBakeSteps({
      pipeline: {
        mode: 'heightfield-terrain',
        hasHeightmap: true,
        hasCollider: false,
        hasSource: true,
      },
      terrain: {
        dirty: true,
        lastGeneratedAt: '2026-05-12T00:00:00.000Z',
        lastChunksGeneratedAt: '2026-05-11T00:00:00.000Z',
      },
      terrainSculptEnabled: true,
      groundMode: 'terrain-chunks',
    }),
    ['collision', 'chunks', 'validation'],
  )
})

test('editor terrain pipeline runner builds stable backend requests', () => {
  assert.deepEqual(
    buildTerrainHeightmapRequest({
      levelId: 'fixture-level',
      nodeId: 'terrain-source',
      sources: [
        {
          nodeId: 'terrain-source',
          sourceName: 'Terrain Source',
          sourceAssetUrl: '/models/levels/fixture.glb',
          matrix: [1, 0, 0, 0],
        },
      ],
      resolution: 256,
    }),
    {
      levelId: 'fixture-level',
      nodeId: 'terrain-source',
      sources: [
        {
          nodeId: 'terrain-source',
          sourceName: 'Terrain Source',
          sourceAssetUrl: '/models/levels/fixture.glb',
          matrix: [1, 0, 0, 0],
        },
      ],
      resolution: 256,
      bakeCollision: true,
    },
  )
  assert.deepEqual(
    buildTerrainChunkCookRequest({
      levelId: 'fixture-level',
      sourceGlbCook: true,
    }),
    {
      levelId: 'fixture-level',
      mode: 'glb-chunk-terrain',
    },
  )
})

test('editor terrain pipeline runner applies generated heightmap products', () => {
  const next = applyTerrainHeightmapPayload(
    {
      collision: {
        terrain: {
          dirty: true,
          heightmapDirty: true,
          chunksPath: '/terrain/levels/old/',
        },
      },
    },
    {
      manifestUrl: '/terrain/fixture-level.manifest.json',
      heightmapUrl: '/terrain/heightmaps/fixture-level_heightmap.png',
      resolution: 512,
      sourceAssetUrl: '/models/levels/fixture.glb',
      sourceNodeIds: ['terrain-source'],
      sourceName: 'Terrain Source',
      collision: {
        url: '/terrain/collision/fixture-level.collider.bin',
        metadataUrl: '/terrain/collision/fixture-level.collider.meta.json',
        triangleCount: 128,
        vertexCount: 81,
      },
    },
    {
      selectedNodeId: 'terrain-source',
      selectedTerrainSourceName: 'Terrain Source',
    },
  )

  assert.equal(next.collision?.terrain?.source, 'baked-heightmap')
  assert.equal(next.collision?.terrain?.runtimeSource, 'generated-heightmap')
  assert.equal(next.collision?.terrain?.heightmapDirty, false)
  assert.equal(next.collision?.terrain?.dirty, false)
  assert.equal(next.collision?.terrain?.lastChunksGeneratedAt, '')
  assert.equal(
    next.collision?.terrain?.colliderUrl,
    '/terrain/collision/fixture-level.collider.bin',
  )
})

test('editor terrain pipeline runner applies source GLB chunk products', () => {
  const next = applyTerrainChunkCookPayload(
    {
      collision: {
        terrain: {
          sourceAssetUrl: '/models/levels/fixture.glb',
        },
      },
      ground: {},
    },
    {
      manifestUrl: '/terrain/fixture-level.manifest.json',
      chunksPath: '/terrain/levels/fixture-level/',
      grid: 4,
      chunkCount: 16,
      lods: [0],
      sourceAssetUrl: '/models/levels/fixture.glb',
      sourceHash: 'abc123',
      preservation: {
        sourceUvs: true,
        materialSlots: true,
        normals: true,
      },
    },
    {
      sourceGlbCook: true,
    },
  )

  assert.equal(next.ground?.terrainRuntimeMode, 'glb-chunk-terrain')
  assert.equal(next.ground?.terrainVisualSource, 'source-glb-chunks')
  assert.equal(next.collision?.terrain?.runtimeMode, 'glb-chunk-terrain')
  assert.equal(next.collision?.terrain?.visualSource, 'source-glb-chunks')
  assert.equal(next.collision?.terrain?.renderChunks?.type, 'glb-chunk-terrain')
  assert.equal(
    next.collision?.terrain?.renderChunks?.preservesSourceUvs,
    true,
  )
  assert.equal(
    next.collision?.terrain?.renderChunks?.preservesSourceMaterialSlots,
    true,
  )
})

test('heightmap dirty state regenerates before terrain bake work', () => {
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene: createScene({
      settings: {
        level: {
          collision: {
            terrain: {
              source: 'baked-heightmap',
              manifestUrl: '/terrain/fixture-level.manifest.json',
              sourceNodeIds: ['fixture-asset'],
              sourceAssetUrls: ['/generated/runtime-game-assets/fixture.glb'],
              heightmapDirty: true,
            },
          },
          terrainSculpt: {
            enabled: true,
          },
        },
      },
    }),
  })

  assert.deepEqual(
    plan.steps.filter((step) =>
      ['generate-heightmap', 'bake-terrain-collision'].includes(step),
    ),
    ['generate-heightmap', 'bake-terrain-collision'],
  )
  assert.equal(plan.blockers.length, 0)
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
        'cook-terrain-glb-chunks',
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
    calls.map((call) => call.args[2]),
    [
      'bake:terrain-collision',
      'cook:terrain-chunks',
      'cook:terrain-glb-chunks',
      'cook:world-partition',
      'cook:runtime-assets',
      'audit:engine',
    ],
  )
  assert.deepEqual(
    (response.payload.steps as Array<{ id: string }>).map((step) => step.id),
    [
      'bake-terrain-collision',
      'cook-terrain-chunks',
      'cook-terrain-glb-chunks',
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
