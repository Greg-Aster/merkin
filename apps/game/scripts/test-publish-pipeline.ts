import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { upgradeLegacySceneDocument } from '../src/threlte/editor/defaultScenes.ts'
import {
  applyCollisionLifecycleToPatch,
  materializeEditorNodeCollision,
} from '../src/threlte/editor/editorCollisionLifecycle.ts'
import {
  applyGeneratedAssetToNode,
  createGeneratedAssetNode,
} from '../src/threlte/editor/editorGeneratedAssetApplication.ts'
import { normalizeLevelSceneSettings } from '../src/threlte/editor/editorLevelSetup.ts'
import {
  EDITOR_PUBLISH_BAKE_STEP_LABELS,
  computeEditorPublishBakePlan,
  createEditorPublishBakePlanMetadataFromReadiness,
} from '../src/threlte/editor/editorPublishBakePlan.ts'
import { buildEditorPublishReadinessViewModel } from '../src/threlte/editor/editorPublishReadiness.ts'
import {
  validateEditorSceneDocument,
  validatePublishableEditorSceneDocument,
} from '../src/threlte/editor/editorSceneDocumentValidation.ts'
import {
  describeEditorTerrainPipeline,
  planEditorTerrainBakeSteps,
} from '../src/threlte/editor/editorTerrainPipeline.ts'
import {
  applyTerrainChunkCookPayload,
  applyTerrainSourceImportPayload,
  buildTerrainChunkCookRequest,
} from '../src/threlte/editor/editorTerrainPipelineRunner.ts'
import type { EditorSceneDocument } from '../src/threlte/editor/editorTypes.ts'
import { reviewCollisionContracts } from '../src/threlte/engine/collisionReview.ts'
import {
  classifyTerrainAuthority,
  getTerrainAuthorityDiagnostics,
} from '../src/threlte/engine/groundContract.ts'
import {
  createLevelRuntimeReadinessContract,
  evaluateLevelRuntimeActivation,
} from '../src/threlte/engine/levelRuntimeReadinessContract.ts'
import { createLevelBuildReport } from '../src/threlte/engine/levelValidation.ts'
import type { NpcComponent } from '../src/threlte/engine/npcTypes.ts'
import {
  createRuntimeSceneManifest,
  getRuntimeSceneRequiredAssetUrls,
  getRuntimeSceneRuntimeAssetUrls,
  validateRuntimeSceneManifest,
} from '../src/threlte/engine/runtimeSceneManifest.ts'
import { adaptSceneDocumentToLevelDefinition } from '../src/threlte/engine/sceneAdapter.ts'
import { resolveSceneFireflyFieldQuality } from '../src/threlte/engine/sceneFireflyField.ts'
import type {
  GeneratedCollisionProduct,
  LevelDefinition,
} from '../src/threlte/engine/types.ts'
import { CANONICAL_CONVERSATION_PROFILE_IDS } from '../src/threlte/features/conversation/characters/profileManifest.mjs'
import { startNpcConversationFromComponent } from '../src/threlte/features/npc/index.ts'
import {
  resolveRuntimePointLightVisibility,
  resolveRuntimeVisibilityPolicy,
} from '../src/threlte/features/performance/utils/runtimeSceneBudget.ts'
import {
  type TerrainManifest,
  validateTerrainManifestCollisionContract,
} from '../src/threlte/features/terrain/terrainManifest.ts'
import { getSceneTerrainRuntimeRequest } from '../src/threlte/levels/sceneTerrainRuntime.ts'

const require = createRequire(import.meta.url)
const {
  handleSceneRoutes,
  normalizePublishBuildPlan,
  runPublishBuildPlan,
} = require('./editor-tools/sceneRoutes.cjs')
const { handleTerrainRoutes } = require('./editor-tools/terrainRoutes.cjs')
const { handleStyleRoutes } = require('./editor-tools/styleRoutes.cjs')
const {
  adaptSceneDocumentToLevelDefinition:
    adaptRuntimeSceneDocumentToLevelDefinition,
  createLevelBuildReport: createRuntimeSceneLevelBuildReport,
} = await import('./lib/runtimeSceneManifest.mjs')
const { createGeneratedCollisionProduct, validateGeneratedCollisionProduct } =
  await import('./lib/meshCollisionProducts.mjs')
const {
  createStyleBakeProduct,
  findReusableStyleBakeProduct,
  getStyleBakeCacheKey,
  getStyleBakeSettingsFingerprint,
  styleBakeProceduralGenerator,
} = await import('./lib/styleBakeProducts.mjs')
const { auditRuntimeAssetManifestObject } = await import(
  './lib/runtimeAssetManifestAudit.mjs'
)
const { auditSceneArchitecture } = await import(
  './lib/sceneArchitectureAudit.mjs'
)
const { auditSourceGuards } = await import('./lib/engineAuditSourceGuards.mjs')
const { isStyleBakeMetadata } = await import(
  './lib/runtimeAssetCookManifest.mjs'
)

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

function createFireflyNpc(overrides: Partial<NpcComponent> = {}): NpcComponent {
  const base: NpcComponent = {
    id: 'fixture-firefly',
    archetype: 'firefly',
    displayName: 'Fixture Firefly',
    interaction: {
      enabled: true,
      mode: 'click',
      prompt: 'Listen',
      eventKey: 'fixture_firefly',
    },
    conversation: {
      mode: 'read-only',
      title: 'Fixture Firefly',
      body: 'A fixture firefly keeps a tiny contract alive.',
      durationMs: 1000,
    },
    behavior: {
      type: 'hover-wander',
      radius: 0.8,
      speed: 0.2,
      hoverHeight: 0.4,
      bobAmplitude: 0.1,
      bobSpeed: 0.8,
    },
    presentation: {
      type: 'firefly',
      color: '#f4ffb8',
      size: 0.5,
      spriteIntensity: 1,
      lightIntensity: 2,
      lightDistance: 7,
      lightDecay: 1.4,
      twinkleSpeed: 0.8,
      lightBurstBoost: 1.25,
      selectionLightBoost: 3,
      lightBurstSpriteBoost: 0.55,
      shockwaveEnabled: true,
    },
  }

  return {
    ...base,
    ...overrides,
    interaction: {
      ...base.interaction,
      ...(overrides.interaction ?? {}),
    },
    conversation: overrides.conversation ?? base.conversation,
    behavior: overrides.behavior ?? base.behavior,
    presentation: {
      ...base.presentation,
      ...(overrides.presentation ?? {}),
    },
  }
}

function createNpcFixtureGroundNode(): EditorSceneDocument['nodes'][number] {
  return {
    id: 'fixture-ground',
    name: 'Fixture Ground',
    kind: 'primitive',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    primitive: {
      geometry: 'box',
      args: [8, 0.5, 8],
      color: '#334155',
    },
    collision: {
      mode: 'auto',
      quality: 'primitive',
      intent: 'walkable',
      channel: 'worldStatic',
    },
  }
}

function createNpcFixtureGroundProduct(): GeneratedCollisionProduct {
  return {
    actorId: 'fixture-ground',
    mode: 'auto',
    productId: 'fixture-ground:auto:primitive',
    sourceKind: 'primitive',
    sourceMeshFingerprint: 'fixture-ground-source',
    transformFingerprint: 'fixture-ground-transform',
    policyFingerprint: 'fixture-ground-policy',
    shape: 'cuboid',
    localBounds: {
      min: [-4, -0.25, -4],
      max: [4, 0.25, 4],
      size: [8, 0.5, 8],
      center: [0, 0, 0],
    },
    generatedAt: '2026-05-17T00:00:00.000Z',
    generatorVersion: 'fixture-generator-v1',
  }
}

function createNpcFixtureLevelSettings(
  maxGameplayFireflies = 2,
): EditorSceneDocument['settings'] {
  return {
    level: {
      spawn: {
        position: [0, 1, 0],
        rotation: [0, 0, 0],
      },
      graphicsBudget: {
        maxGameplayFireflies,
      },
      collision: {
        roles: {
          groundActorIds: ['fixture-ground'],
        },
        walkability: {
          supportMaxDrop: 2,
        },
      },
      ground: {
        mode: 'scene-authored',
        visualSource: 'scene-actors',
        terrainRuntimeMode: 'scene-authored',
        terrainVisualSource: 'scene-actors',
        collisionSource: 'scene-colliders',
        fallbackSurfacePolicy: 'disabled',
        groundActorIds: ['fixture-ground'],
      },
    },
  }
}

function createFireflyNpcScene(
  npcOverrides: Partial<NpcComponent> = {},
  nodeOverrides: Partial<EditorSceneDocument['nodes'][number]> = {},
): EditorSceneDocument {
  return createScene({
    nodes: [
      createNpcFixtureGroundNode(),
      {
        id: 'fixture-firefly',
        name: 'Fixture Firefly',
        kind: 'group',
        position: [0, 1.4, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        npc: createFireflyNpc(npcOverrides),
        ...nodeOverrides,
      },
    ],
    settings: createNpcFixtureLevelSettings(2),
  })
}

const fixtureBounds = {
  min: [0, 0, 0] as [number, number, number],
  max: [10, 2, 10] as [number, number, number],
}
const fixtureSourceFingerprint = {
  algorithm: 'sha256',
  value: 'a'.repeat(64),
}
const fixtureStyleSourceFingerprint = {
  algorithm: 'sha256',
  value: 'c'.repeat(64),
}
const fixtureStyleSettingsFingerprint = {
  algorithm: 'sha256',
  value: 'd'.repeat(64),
}

function createFixtureRuntimeAssetMetadata(
  overrides: Record<string, unknown> = {},
) {
  return {
    format: 'glb',
    valid: true,
    errors: [],
    nodeCount: 1,
    meshCount: 1,
    meshPrimitiveCount: 1,
    vertexCount: 24,
    triangleCount: 12,
    bounds: {
      min: [-1, -1, -1],
      max: [1, 1, 1],
      size: [2, 2, 2],
      center: [0, 0, 0],
    },
    materialCount: 1,
    materialSlots: 1,
    materials: [],
    materialValidation: {
      missingTextureReferences: [],
      missingRecommendedSlots: [],
      unsupportedExtensions: [],
    },
    textureCount: 3,
    imageCount: 3,
    unusedTextureCount: 0,
    unusedImageCount: 0,
    unusedTextureBytes: 0,
    textureBytes: 4096,
    textures: [
      {
        index: 0,
        imageIndex: 0,
        mimeType: 'image/webp',
        width: 512,
        height: 512,
        byteLength: 1024,
        roles: ['baseColor'],
        colorSpace: 'srgb',
        compression: 'webp',
      },
    ],
    compression: {
      extensionsUsed: ['KHR_mesh_quantization'],
      geometry: {
        dracoPrimitiveCount: 0,
        meshoptAccessorCount: 0,
        quantized: true,
      },
      textures: {
        basisuTextureCount: 0,
        webpTextureCount: 3,
        mimeTypes: {
          'image/webp': 3,
        },
      },
    },
    ...overrides,
  }
}

function createStyleBakeReadinessFixture({
  runtimeStyleBake = {},
  metadata = {},
  assetEntry = {},
  required = true,
}: {
  runtimeStyleBake?: Record<string, unknown>
  metadata?: Record<string, unknown>
  assetEntry?: Record<string, unknown> | null
  required?: boolean
} = {}) {
  const assetUrl =
    '/generated/style-lab/baked-style/fixture-style/fixture-style-baked.glb'
  const metadataUrl =
    '/generated/style-lab/baked-style/fixture-style/fixture-style-baked.json'
  const sourceAssetUrl = '/generated/style-lab/sources/fixture/source.glb'
  const styleSettings = {
    styleProfileName: 'Fixture Style',
    prompt: 'fixture prompt',
    textureSize: 512,
  }
  const scene = createScene({
    nodes: [
      {
        id: 'fixture-style-actor',
        name: 'Fixture Style Actor',
        kind: 'asset',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: assetUrl,
        },
        generation: {
          descriptor: 'fixture style actor',
          originalAssetUrl: sourceAssetUrl,
          lastBakedAssetUrl: assetUrl,
          lastBakedAt: '2026-05-13T00:00:00.000Z',
          styleBakeProduct: {
            schemaVersion: 1,
            required,
            sourceAssetUrl,
            sourceAssetFingerprint: fixtureStyleSourceFingerprint,
            generatedAssetUrl: assetUrl,
            generatedMetadataUrl: metadataUrl,
            assetUrl,
            metadataUrl,
            settings: styleSettings,
            settingsFingerprint: fixtureStyleSettingsFingerprint,
            status: 'clean',
            state: {
              status: 'ready',
            },
          },
        },
      },
    ],
    settings: {
      level: {
        spawn: {
          position: [0, 1, 0],
          rotation: [0, 0, 0],
        },
        runtimeAssets: {
          requiredRenderActorIds: required ? ['fixture-style-actor'] : [],
        },
        ground: {
          mode: 'scene-authored',
          visualSource: 'scene-actors',
          terrainRuntimeMode: 'scene-authored',
          terrainVisualSource: 'scene-actors',
          collisionSource: 'scene-colliders',
          fallbackSurfacePolicy: 'disabled',
        },
      },
    },
  })
  const levelDefinition = adaptSceneDocumentToLevelDefinition(scene)
  const buildReport = createLevelBuildReport(levelDefinition)
  const runtimeScene = createRuntimeSceneManifest({
    scene,
    sceneId: scene.levelId,
    sourcePath: '/src/threlte/editor/scenes/fixture-level.scene.json',
    levelDefinition,
    buildReport,
    generatedAt: '2026-05-13T00:00:00.000Z',
  })
  const runtimeMetadata = createFixtureRuntimeAssetMetadata()
  const entry =
    assetEntry === null
      ? null
      : {
          sourceUrl: assetUrl,
          status: required ? 'required' : 'optional',
          required,
          sourceExists: true,
          sourceSizeBytes: 8192,
          importMetadata: {
            id: 'fixture-style',
          },
          metadata: runtimeMetadata,
          materialCompliance: {
            approvedMissingRecommendedSlots: [],
          },
          styleBake: {
            schemaVersion: 1,
            status: 'clean',
            runtimeCookRequired: true,
            runtimeCooked: true,
            metadataUrl,
            sourceAssetUrl,
            generatedAssetUrl: assetUrl,
            sourceAssetFingerprint: fixtureStyleSourceFingerprint,
            currentSourceAssetFingerprint: fixtureStyleSourceFingerprint,
            sourceAssetFingerprintMatches: true,
            styleSettings,
            styleSettingsFingerprint: fixtureStyleSettingsFingerprint,
            expectedStyleSettingsFingerprint: fixtureStyleSettingsFingerprint,
            styleSettingsFingerprintMatches: true,
            budget: {
              selectedTier: 'medium',
              maxTextureSize: 1024,
              maxTextureCount: null,
              textureCount: 3,
              oversizedTextures: 0,
              unusedTextureCount: 0,
              overBudget: false,
            },
            diagnostics: [],
            ...runtimeStyleBake,
          },
          qualityVariants: {
            high: {
              exists: true,
              url: assetUrl.replace('.glb', '.high.glb'),
              sizeBytes: 4096,
              metadata: runtimeMetadata,
              pipeline: { textureSize: 2048 },
              lodValidation: { meetsTarget: true },
            },
            medium: {
              exists: true,
              url: assetUrl.replace('.glb', '.medium.glb'),
              sizeBytes: 3072,
              metadata: runtimeMetadata,
              pipeline: { textureSize: 1024 },
              lodValidation: { meetsTarget: true },
            },
            low: {
              exists: true,
              url: assetUrl.replace('.glb', '.low.glb'),
              sizeBytes: 2048,
              metadata: runtimeMetadata,
              pipeline: { textureSize: 512 },
              lodValidation: { meetsTarget: true },
            },
          },
          ...assetEntry,
        }
  const runtimeAssetManifest = {
    schemaVersion: 1,
    generatedAt: '2026-05-13T00:00:00.000Z',
    contentBuild: { buildId: 'fixture-build' },
    streamingPolicy: {},
    platformCertification: {},
    impostorAtlas: { entryCount: 0 },
    importManifest: { path: 'fixture-import-manifest.json' },
    importValidation: {
      warnings: [],
      failures: [],
      report: {
        metadataAssetCount: entry ? 1 : 0,
        missingImportMetadata: 0,
        duplicateAssetIds: 0,
      },
    },
    assets: entry ? { [assetUrl]: entry } : {},
    runtimeScenes: {
      [scene.levelId]: {
        url: `/generated/runtime-game-assets/scenes/${scene.levelId}.runtime-scene.json`,
      },
    },
  }
  const styleBakeMetadata = {
    [metadataUrl]: {
      value: {
        sourceAssetUrl,
        outputAssetUrl: assetUrl,
        sourceAssetFingerprint: fixtureStyleSourceFingerprint,
        styleSettingsFingerprint: fixtureStyleSettingsFingerprint,
        styleProfileName: styleSettings.styleProfileName,
        prompt: styleSettings.prompt,
        textureSize: styleSettings.textureSize,
        mode: 'procedural-material',
        generator: 'Merkin deterministic procedural style bake',
        ...metadata,
      },
      error: '',
    },
  }

  return {
    assetUrl,
    metadataUrl,
    scene,
    runtimeScene,
    runtimeAssetManifest,
    styleBakeMetadata,
  }
}

test('collision lifecycle carries collision policy when the visual asset changes', () => {
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
      mode: 'auto',
      quality: 'simplifiedMesh',
      intent: 'blocker',
      channel: 'worldStatic',
      friction: 0.7,
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

  assert.equal(patch.collision?.mode, 'auto')
  assert.equal(patch.collision?.quality, 'simplifiedMesh')
  assert.equal(patch.collision?.intent, 'blocker')
  assert.equal(patch.collision?.channel, 'worldStatic')
  assert.equal(patch.collision?.friction, 0.7)
  assert.equal('size' in (patch.collision ?? {}), false)
  assert.equal(patch.generation?.sourceVisualSize?.[0], 12)
})

test('collision lifecycle does not synthesize collider geometry for transform-only edits', () => {
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
      mode: 'auto',
      quality: 'simplifiedMesh',
      intent: 'blocker',
      channel: 'worldStatic',
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    scale: [4, 1, 2],
  })

  assert.equal(patch.collision, undefined)
  assert.deepEqual(patch.scale, [4, 1, 2])
})

test('collision lifecycle converts primitive shape edits to generated policy', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'resized-blockout',
    name: 'Resized Blockout',
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
      mode: 'auto',
      quality: 'primitive',
      intent: 'blocker',
      channel: 'worldStatic',
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    primitive: {
      geometry: 'box',
      args: [8, 2, 0.5],
    },
  })

  assert.equal(patch.collision?.mode, 'auto')
  assert.equal(patch.collision?.quality, 'primitive')
  assert.equal(patch.collision?.intent, 'blocker')
  assert.equal('size' in (patch.collision ?? {}), false)
})

test('collision lifecycle materializes default collision from the patched primitive state', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'hidden-blockout',
    name: 'Hidden Blockout',
    kind: 'primitive',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    primitive: {
      geometry: 'box',
      args: [4, 1, 4],
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    visible: false,
    primitive: {
      geometry: 'box',
      args: [8, 1, 8],
    },
  })

  assert.equal(patch.collision, undefined)
})

test('collision lifecycle leaves simple collision size alone when lock is disabled', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'unlocked-scaled-asset',
    name: 'Unlocked Scaled Asset',
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
      lockToObject: false,
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    scale: [4, 1, 2],
  })

  assert.equal(patch.collision, undefined)
})

test('collision lifecycle keeps policy intent during visual source replacement', () => {
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
      mode: 'auto',
      quality: 'primitive',
      intent: 'blocker',
      channel: 'worldStatic',
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    kind: 'asset',
    asset: {
      url: '/generated/runtime-game-assets/blockout-wall-final.glb',
    },
    primitive: undefined,
  })

  assert.equal(patch.collision?.mode, 'auto')
  assert.equal(patch.collision?.quality, 'primitive')
  assert.equal(patch.collision?.intent, 'blocker')
  assert.equal('size' in (patch.collision ?? {}), false)
})

test('collision lifecycle keeps primitive walkable collision during visual replacement', () => {
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
      mode: 'auto',
      quality: 'primitive',
      intent: 'walkable',
      channel: 'worldStatic',
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    kind: 'asset',
    asset: {
      url: '/generated/runtime-game-assets/blockout-floor-final.glb',
    },
    primitive: undefined,
  })
  const nextNode = { ...currentNode, ...patch }

  assert.equal(nextNode.collision?.intent, 'walkable')
  assert.equal('size' in (nextNode.collision ?? {}), false)
})

test('collision lifecycle keeps disabled collision during visual replacement', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'disabled-prop',
    name: 'Disabled Prop',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: {
      url: '/generated/runtime-game-assets/old-prop.glb',
    },
    collision: {
      mode: 'none',
      intent: 'none',
      channel: 'worldStatic',
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    asset: {
      url: '/generated/runtime-game-assets/new-prop.glb',
    },
  })
  const nextNode = { ...currentNode, ...patch }

  assert.equal(nextNode.collision?.mode, 'none')
  assert.equal(nextNode.collision?.intent, 'none')
  assert.equal('size' in (nextNode.collision ?? {}), false)
})

test('collision lifecycle keeps visual-only replacement visual-only', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'visual-prop',
    name: 'Visual Prop',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: {
      url: '/generated/runtime-game-assets/old-visual.glb',
    },
  }
  const settings: EditorSceneDocument['settings'] = {
    level: {
      collision: {
        roles: {
          visualOnlyActorIds: ['visual-prop'],
        },
      },
    },
  }

  const patch = applyCollisionLifecycleToPatch(
    currentNode,
    {
      asset: {
        url: '/generated/runtime-game-assets/new-visual.glb',
      },
    },
    settings,
  )
  const nextNode = { ...currentNode, ...patch }

  assert.equal(nextNode.collision, undefined)
})

test('primitive mesh conversion emits policy without preserved source geometry', () => {
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
      mode: 'auto',
      quality: 'primitive',
      intent: 'blocker',
      channel: 'worldStatic',
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    kind: 'asset',
    asset: {
      url: '/generated/runtime-game-assets/scaled-blockout-final.glb',
    },
    primitive: undefined,
  })

  assert.equal(patch.collision?.mode, 'auto')
  assert.equal(patch.collision?.quality, 'primitive')
  assert.equal('size' in (patch.collision ?? {}), false)
})

test('generated AI replacement relies on lifecycle policy regeneration', async () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'ai-target',
    name: 'AI Target',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: {
      url: '/generated/runtime-game-assets/old-ai-target.glb',
    },
    collision: {
      mode: 'auto',
      quality: 'simplifiedMesh',
      intent: 'blocker',
      channel: 'worldStatic',
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
  assert.equal(nextNode.collision?.mode, 'auto')
  assert.equal(nextNode.collision?.quality, 'simplifiedMesh')
  assert.equal(nextNode.collision?.intent, 'blocker')
  assert.equal('size' in (nextNode.collision ?? {}), false)
})

test('generated variant apply changes visual fit while lifecycle keeps mesh policy', async () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'root-southwest-fixture',
    name: 'Root southwest fixture',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [7.15364276125778, 40.34019117553966, 7.578584968492239],
    visible: true,
    asset: {
      url: '/generated/hunyuan3d/root-southwest/root-southwest-generated.glb',
    },
    collision: {
      mode: 'auto',
      quality: 'simplifiedMesh',
      friction: 0.88,
      intent: 'blocker',
      channel: 'worldStatic',
    },
    generation: {
      sourceVisualSize: [14.06864, 76.47048, 14.79264],
    },
  }
  let capturedPatch:
    | Parameters<typeof applyCollisionLifecycleToPatch>[1]
    | null = null

  await applyGeneratedAssetToNode(
    {
      getSceneNodeVisualBounds: async () => ({
        size: [14.06864, 76.47048, 14.79264],
        maxDimension: 76.47048,
      }),
      inspectGeneratedAssetBounds: async () => ({
        size: [5.386784076690674, 29.280000686645508, 5.664000034332275],
        maxDimension: 29.280000686645508,
      }),
      patchNode: (_nodeId, patch) => {
        capturedPatch = patch
      },
      appendPipelineLog: () => {},
      getNodeTransformSnapshot: () => ({
        position: currentNode.position,
        rotation: currentNode.rotation,
        scale: currentNode.scale,
      }),
    },
    currentNode,
    '/generated/style-lab/sources/root-southwest/root-southwest.glb',
    { descriptor: 'fixture target' },
  )

  assert.ok(capturedPatch)
  const expectedScale = [
    2.6116955496465626, 2.6116966600645566, 2.6116948994234765,
  ]
  assert.ok(
    capturedPatch.scale?.every(
      (value, index) => Math.abs(value - expectedScale[index]) < 0.000001,
    ),
  )
  assert.equal(capturedPatch.collision, undefined)
  const patch = applyCollisionLifecycleToPatch(currentNode, capturedPatch)
  assert.equal(patch.collision?.mode, 'auto')
  assert.equal(patch.collision?.quality, 'simplifiedMesh')
  assert.equal(patch.collision?.intent, 'blocker')
  assert.equal('size' in (patch.collision ?? {}), false)
})

test('editor validation rejects removed proxy collision metadata', () => {
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
          authoring: {
            kind: 'editor-proxy',
            bakeStatus: 'needsBake',
            sourceAssetUrl:
              '/generated/hunyuan3d/root-mound/root-mound-generated.glb',
          },
        },
      },
    ],
  })

  const editorValidation = validateEditorSceneDocument(scene)
  assert.equal(editorValidation.valid, false)
  assert.ok(
    editorValidation.errors.some(error =>
      error.includes('removed editor proxy collision metadata'),
    ),
  )
})

test('editor validation rejects legacy proxy collision fields', () => {
  const scene = createScene({
    nodes: [
      {
        id: 'legacy-proxy',
        name: 'Legacy Proxy',
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
        },
      } as EditorSceneDocument['nodes'][number],
    ],
  })

  const editorValidation = validateEditorSceneDocument(scene)
  assert.equal(editorValidation.valid, false)
  assert.ok(
    editorValidation.errors.some(error =>
      error.includes('removed editor proxy collision metadata'),
    ),
  )
})

function createSceneAuthoredCollisionScene(
  decorOverrides: Partial<EditorSceneDocument['nodes'][number]> = {},
) {
  return createScene({
    nodes: [
      {
        id: 'fixture-ground',
        name: 'Fixture Ground',
        kind: 'primitive',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        primitive: {
          geometry: 'box',
          args: [8, 0.5, 8],
          color: '#808080',
        },
        collision: {
          mode: 'auto',
          quality: 'primitive',
          intent: 'walkable',
          channel: 'worldStatic',
        },
      },
      {
        id: 'fixture-decor',
        name: 'Fixture Decor',
        kind: 'asset',
        position: [2, 0.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: '/generated/runtime-game-assets/fixture-decor.glb',
        },
        ...decorOverrides,
      },
    ],
    settings: {
      level: {
        spawn: {
          position: [0, 1, 0],
          rotation: [0, 0, 0],
        },
        ground: {
          mode: 'scene-authored',
          visualSource: 'scene-actors',
          terrainRuntimeMode: 'scene-authored',
          terrainVisualSource: 'scene-actors',
          collisionSource: 'scene-colliders',
          fallbackSurfacePolicy: 'disabled',
          groundActorIds: ['fixture-ground'],
        },
        collision: {
          review: {
            requireExplicitClassification: true,
          },
          defaults: {
            primitiveCollisionByDefault: true,
          },
          roles: {
            groundActorIds: ['fixture-ground'],
            visualOnlyActorIds: [],
          },
          terrain: {
            source: 'scene-authored',
            runtimeMode: 'scene-authored',
            visualSource: 'scene-actors',
            fallbackSurfacePolicy: 'disabled',
          },
        },
      },
    },
  })
}

test('WIP scene with visible unclassified geometry can save but cannot publish', () => {
  const scene = createSceneAuthoredCollisionScene()

  const editorValidation = validateEditorSceneDocument(scene)
  assert.equal(editorValidation.valid, true)

  const publishValidation = validatePublishableEditorSceneDocument(scene)
  assert.equal(publishValidation.valid, false)
  assert.ok(
    publishValidation.errors.some(error =>
      error.includes('Visible geometry must be classified'),
    ),
  )

  const review = reviewCollisionContracts({ scene })
  assert.deepEqual(review.classification['missing-collision'], [
    'fixture-decor',
  ])
  assert.ok(
    review.findings.some(
      finding =>
        finding.code === 'unclassified-visible-geometry' &&
        finding.severity === 'error',
    ),
  )
})

test('visible no-collision geometry can publish when explicitly classified', () => {
  const scene = createSceneAuthoredCollisionScene({
    collision: {
      mode: 'none',
      intent: 'none',
    },
  })

  const publishValidation = validatePublishableEditorSceneDocument(scene)
  assert.equal(publishValidation.valid, true)

  const review = reviewCollisionContracts({ scene })
  assert.deepEqual(review.classification.disabled, ['fixture-decor'])
  assert.deepEqual(review.classification['missing-collision'], [])
})

test('conversation profile manifest matches character definitions', () => {
  const definitionIds = readdirSync(
    join(
      process.cwd(),
      'src/threlte/features/conversation/characters/definitions',
    ),
  )
    .filter(fileName => fileName.endsWith('.ts'))
    .map(fileName => fileName.replace(/\.ts$/, ''))
    .sort()

  assert.deepEqual(
    [...CANONICAL_CONVERSATION_PROFILE_IDS].sort(),
    definitionIds,
  )
})

test('public NPC barrel exports the component conversation bridge', async () => {
  assert.equal(typeof startNpcConversationFromComponent, 'function')

  const npcWithoutConversation = createFireflyNpc()
  npcWithoutConversation.conversation = undefined

  const result = await startNpcConversationFromComponent({
    npc: npcWithoutConversation,
    actorId: 'fixture-firefly',
    levelId: 'fixture-level',
  })

  assert.equal(result.status, 'none')
  assert.equal(result.eventKey, 'fixture_firefly')
})

test('runtime scene manifests preserve NPC firefly components and diagnostics', () => {
  const scene = createFireflyNpcScene()
  const groundProduct = createNpcFixtureGroundProduct()
  const level = adaptSceneDocumentToLevelDefinition(scene, {
    generatedCollisionProductsByActorId: new Map([
      [groundProduct.actorId, groundProduct],
    ]),
  })
  const report = createLevelBuildReport(level)

  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
  assert.equal(report.npcActorCount, 1)
  assert.equal(report.fireflyNpcActorCount, 1)
  const fireflyActor = level.actors.find(
    actor => actor.id === 'fixture-firefly',
  )
  assert.equal(fireflyActor?.npc?.id, 'fixture-firefly')

  const runtimeLevel = adaptRuntimeSceneDocumentToLevelDefinition(scene)
  const runtimeReport = createRuntimeSceneLevelBuildReport(runtimeLevel)
  const runtimeFireflyActor = runtimeLevel.actors.find(
    (actor: LevelDefinition['actors'][number]) =>
      actor.id === 'fixture-firefly',
  )
  assert.equal(runtimeFireflyActor?.npc?.id, 'fixture-firefly')
  assert.equal(runtimeReport.npcActorCount, 1)
  assert.equal(runtimeReport.fireflyNpcActorCount, 1)

  const manifest = createRuntimeSceneManifest({
    scene,
    sceneId: scene.levelId,
    sourcePath: '/src/threlte/editor/scenes/fixture-level.scene.json',
    levelDefinition: runtimeLevel,
    buildReport: runtimeReport,
    generatedAt: '2026-05-17T00:00:00.000Z',
  })
  const validation = validateRuntimeSceneManifest(manifest, scene.levelId)

  const manifestFireflyActor = manifest.levelDefinition.actors.find(
    actor => actor.id === 'fixture-firefly',
  )
  assert.equal(manifestFireflyActor?.npc?.id, 'fixture-firefly')
  assert.equal(
    manifestFireflyActor?.npc?.presentation.type === 'firefly'
      ? manifestFireflyActor.npc.presentation.lightBurstBoost
      : null,
    1.25,
  )
  assert.equal(
    manifestFireflyActor?.npc?.presentation.type === 'firefly'
      ? manifestFireflyActor.npc.presentation.selectionLightBoost
      : null,
    3,
  )
  assert.equal(
    manifestFireflyActor?.npc?.presentation.type === 'firefly'
      ? manifestFireflyActor.npc.presentation.lightBurstSpriteBoost
      : null,
    0.55,
  )
  assert.equal(
    manifestFireflyActor?.npc?.presentation.type === 'firefly'
      ? manifestFireflyActor.npc.presentation.shockwaveEnabled
      : null,
    true,
  )
  assert.deepEqual(validation.errors, [])
  assert.deepEqual(validation.warnings, [])
})

test('ambient firefly fields resolve quality-tier counts without authoring NPC actors', () => {
  const quality = resolveSceneFireflyFieldQuality({
    qualityTier: 'high',
    settings: {
      enabled: true,
      count: 200,
      lightCount: 25,
      distribution: 'center-falloff',
      densityExponent: 2,
      qualityTiers: {
        ultra_low: { count: 12, lightCount: 2 },
        medium: { count: 80, lightCount: 8 },
        high: { count: 200, lightCount: 25, size: 1.1 },
      },
    },
  })

  assert.equal(quality.tier, 'high')
  assert.equal(quality.count, 200)
  assert.equal(quality.lightCount, 25)
  assert.equal(quality.size, 1.1)
})

test('Observatory source scene uses the recovered ambient firefly lighting contract', () => {
  const scene = JSON.parse(
    readFileSync(
      join(process.cwd(), 'src/threlte/editor/scenes/observatory.scene.json'),
      'utf8',
    ),
  )
  const fireflies = scene.settings?.level?.fireflies
  const authoredFireflyNpcCount = (scene.nodes ?? []).filter(
    (node: any) =>
      node.npc?.archetype === 'firefly' ||
      node.npc?.presentation?.type === 'firefly',
  ).length

  assert.equal(authoredFireflyNpcCount, 0)
  assert.equal(fireflies?.enabled, true)
  assert.equal(fireflies?.count, 200)
  assert.equal(fireflies?.lightCount, 25)
  assert.equal(fireflies?.lightIntensity, 50)
  assert.equal(fireflies?.lightDistance, 500)
  assert.equal(fireflies?.lightBudgeted, false)
  assert.equal(fireflies?.terrainFollow, true)
  assert.equal(fireflies?.distribution, 'center-falloff')
  assert.equal(fireflies?.densityExponent, 2)
  assert.deepEqual(fireflies?.center, [0, 0, 0])
  assert.equal(fireflies?.qualityTiers?.high?.count, 200)
  assert.equal(fireflies?.qualityTiers?.high?.lightCount, 25)
})

test('runtime point-light budgets clamp visible count and source range', () => {
  const policy = resolveRuntimeVisibilityPolicy('high', {
    enableDynamicLighting: true,
    enableShadows: true,
    shadowMapSize: 1024,
  })
  const visible = resolveRuntimePointLightVisibility({
    policy,
    distanceToCamera: 6,
    sourceIntensity: 10,
    sourceDistance: 500,
  })
  const culled = resolveRuntimePointLightVisibility({
    policy,
    distanceToCamera: 29,
    sourceIntensity: 10,
    sourceDistance: 500,
  })
  const unlit = resolveRuntimePointLightVisibility({
    policy,
    distanceToCamera: 6,
    sourceIntensity: 0,
    sourceDistance: 500,
  })

  assert.equal(policy.pointLightBudget.maxVisibleCount, 8)
  assert.equal(visible.visible, true)
  assert.equal(visible.intensity, 8.8)
  assert.equal(visible.distance, 16)
  assert.equal(culled.visible, false)
  assert.equal(culled.intensity, 0)
  assert.equal(culled.distance, 0)
  assert.equal(unlit.visible, false)
  assert.equal(unlit.intensity, 0)
  assert.equal(unlit.distance, 0)
})

test('NPC publish validation accepts canonical profile ids', () => {
  const scene = createFireflyNpcScene({
    conversation: {
      mode: 'profile',
      personalityId: 'elara-voss',
    },
  })
  const level = adaptSceneDocumentToLevelDefinition(scene)
  const report = createLevelBuildReport(level)

  assert.deepEqual(report.errors, [])
})

test('runtime scene validation rejects missing NPC counters for non-NPC scenes', () => {
  const scene = createScene({
    nodes: [createNpcFixtureGroundNode()],
    settings: createNpcFixtureLevelSettings(),
  })
  const groundProduct = createNpcFixtureGroundProduct()
  const level = adaptSceneDocumentToLevelDefinition(scene, {
    generatedCollisionProductsByActorId: new Map([
      [groundProduct.actorId, groundProduct],
    ]),
  })
  const report = createLevelBuildReport(level)
  assert.deepEqual(report.errors, [])

  const manifest = createRuntimeSceneManifest({
    scene,
    sceneId: scene.levelId,
    sourcePath: '/src/threlte/editor/scenes/fixture-level.scene.json',
    levelDefinition: level,
    buildReport: report,
    generatedAt: '2026-05-17T00:00:00.000Z',
  })
  ;(manifest.buildReport as any).npcActorCount = undefined
  ;(manifest.buildReport as any).fireflyNpcActorCount = undefined

  const validation = validateRuntimeSceneManifest(manifest, scene.levelId)
  assert.match(validation.errors.join('\n'), /missing npcActorCount/)
  assert.match(validation.errors.join('\n'), /missing fireflyNpcActorCount/)
  assert.deepEqual(validation.warnings, [])
})

test('runtime scene validation rejects missing NPC counters when NPC actors exist', () => {
  const scene = createFireflyNpcScene()
  const groundProduct = createNpcFixtureGroundProduct()
  const level = adaptSceneDocumentToLevelDefinition(scene, {
    generatedCollisionProductsByActorId: new Map([
      [groundProduct.actorId, groundProduct],
    ]),
  })
  const report = createLevelBuildReport(level)
  assert.deepEqual(report.errors, [])

  const manifest = createRuntimeSceneManifest({
    scene,
    sceneId: scene.levelId,
    sourcePath: '/src/threlte/editor/scenes/fixture-level.scene.json',
    levelDefinition: level,
    buildReport: report,
    generatedAt: '2026-05-17T00:00:00.000Z',
  })
  ;(manifest.buildReport as any).npcActorCount = undefined
  ;(manifest.buildReport as any).fireflyNpcActorCount = undefined

  const validation = validateRuntimeSceneManifest(manifest, scene.levelId)
  assert.match(validation.errors.join('\n'), /missing npcActorCount/)
  assert.match(validation.errors.join('\n'), /missing fireflyNpcActorCount/)
})

test('NPC publish validation reports exact actor fields for invalid firefly data', () => {
  const scene = createScene({
    nodes: [
      createNpcFixtureGroundNode(),
      {
        id: 'invalid-firefly',
        name: 'Invalid Firefly',
        kind: 'group',
        position: [0, 1.2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        npc: createFireflyNpc({
          id: 'duplicate-firefly',
          interaction: {
            mode: 'proximity' as any,
          },
          conversation: {
            mode: 'read-only',
            body: '',
          },
          presentation: {
            lightDistance: -1,
            shockwaveEnabled: 'yes',
          } as any,
        }),
      },
      {
        id: 'unknown-profile-firefly',
        name: 'Unknown Profile Firefly',
        kind: 'group',
        position: [1, 1.2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        npc: createFireflyNpc({
          id: 'duplicate-firefly',
          conversation: {
            mode: 'profile',
            personalityId: 'missing-profile',
          },
        }),
      },
    ],
    settings: createNpcFixtureLevelSettings(1),
  })
  const level = adaptSceneDocumentToLevelDefinition(scene)
  const report = createLevelBuildReport(level)
  const errorText = report.errors.join('\n')

  assert.match(
    errorText,
    /NPC actor "invalid-firefly" field "npc\.interaction\.mode"/,
  )
  assert.match(
    errorText,
    /NPC actor "invalid-firefly" field "npc\.conversation\.body"/,
  )
  assert.match(
    errorText,
    /NPC actor "invalid-firefly" field "npc\.presentation\.lightDistance"/,
  )
  assert.match(
    errorText,
    /NPC actor "invalid-firefly" field "npc\.presentation\.shockwaveEnabled"/,
  )
  assert.match(
    errorText,
    /NPC actor "unknown-profile-firefly" field "npc\.id" duplicates NPC id "duplicate-firefly"/,
  )
  assert.match(
    errorText,
    /NPC actor "unknown-profile-firefly" field "npc\.conversation\.personalityId"/,
  )
  assert.match(
    errorText,
    /2 authored firefly NPC actors exceed level budget of 1/,
  )

  const publishValidation = validatePublishableEditorSceneDocument(scene)
  assert.equal(publishValidation.valid, false)
  assert.match(
    publishValidation.errors.join('\n'),
    /Publish: NPC actor "invalid-firefly" field "npc\.conversation\.body"/,
  )

  const manifest = createRuntimeSceneManifest({
    scene,
    sceneId: scene.levelId,
    sourcePath: '/src/threlte/editor/scenes/fixture-level.scene.json',
    levelDefinition: level,
    buildReport: report,
    generatedAt: '2026-05-17T00:00:00.000Z',
  })
  assert.match(
    validateRuntimeSceneManifest(manifest, scene.levelId).errors.join('\n'),
    /NPC actor "unknown-profile-firefly" field "npc\.conversation\.personalityId"/,
  )

  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: scene.levelId,
    scene,
    runtimeAssetManifest: null,
    runtimeScene: null,
    prefabManifest: { prefabs: [], summary: { prefabCount: 0 } },
    terrainManifest: null,
  })
  assert.match(
    viewModel.blockers.map(item => item.detail).join('\n'),
    /NPC actor "invalid-firefly" field "npc\.conversation\.body"/,
  )
})

test('legacy firefly gameplay is rejected after Agent 07 cutoff', () => {
  const scene = createScene({
    nodes: [
      createNpcFixtureGroundNode(),
      {
        id: 'legacy-firefly',
        name: 'Legacy Firefly',
        kind: 'group',
        position: [0, 1.2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        gameplay: {
          type: 'firefly' as any,
          body: 'A legacy firefly warning fixture.',
        } as any,
      },
    ],
    settings: createNpcFixtureLevelSettings(),
  })
  const level = adaptSceneDocumentToLevelDefinition(scene)
  const report = createLevelBuildReport(level)

  assert.match(
    report.errors.join('\n'),
    /Actor "legacy-firefly" field "gameplay\.type" uses legacy firefly gameplay data/,
  )
})

test('policy-only mesh actors require generated mesh collision artifacts before runtime product', () => {
  const scene = createSceneAuthoredCollisionScene({
    collision: {
      mode: 'auto',
      quality: 'simplifiedMesh',
      intent: 'blocker',
      channel: 'worldStatic',
      maxTriangles: 5000,
    },
  })

  const editorLevel = adaptSceneDocumentToLevelDefinition(scene)
  const editorActor = editorLevel.actors.find(
    actor => actor.id === 'fixture-decor',
  )
  assert.equal(editorActor?.physics?.collision.shape, 'trimesh')
  assert.equal(editorActor?.physics?.collision.triangleBudget, 5000)

  const collisionProductErrors: string[] = []
  const runtimeLevel = adaptRuntimeSceneDocumentToLevelDefinition(scene, {
    collisionProductErrors,
    requireCurrentGeneratedCollision: false,
  })
  const runtimeActor = runtimeLevel.actors.find(
    (actor: LevelDefinition['actors'][number]) => actor.id === 'fixture-decor',
  )

  assert.equal(runtimeActor?.physics?.collision.shape, 'trimesh')
  assert.equal(runtimeActor?.physics?.collision.generatedProduct, undefined)
  assert.ok(
    collisionProductErrors.some((error: string) =>
      error.includes(
        'mesh-derived collision is missing a generated artifact URL',
      ),
    ),
  )
})

test('editor scene adapter attaches only matching generated collision products', () => {
  const scene = createScene({
    nodes: [
      {
        id: 'fixture-generated-asset',
        name: 'Fixture Generated Asset',
        kind: 'asset',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: '/generated/runtime-game-assets/fixture-generated-asset.glb',
        },
        collision: {
          mode: 'auto',
          quality: 'simplifiedMesh',
          intent: 'blocker',
          channel: 'worldStatic',
        },
      },
    ],
  })
  const generatedProduct: GeneratedCollisionProduct = {
    actorId: 'fixture-generated-asset',
    mode: 'auto',
    productId: 'fixture-generated-asset:auto:simplifiedMesh',
    sourceKind: 'asset',
    sourceMeshUrl: '/generated/runtime-game-assets/fixture-generated-asset.glb',
    sourceMeshFingerprint: 'fixture-source',
    transformFingerprint: 'fixture-transform',
    policyFingerprint: 'fixture-policy',
    shape: 'trimesh',
    artifactUrl:
      '/generated/runtime-game-assets/collision/fixture-generated-asset.collider.glb',
    metadataUrl:
      '/generated/runtime-game-assets/collision/fixture-generated-asset.collider.meta.json',
    localBounds: {
      min: [-0.5, -0.5, -0.5],
      max: [0.5, 0.5, 0.5],
      size: [1, 1, 1],
      center: [0, 0, 0],
    },
    generatedAt: '2026-05-14T00:00:00.000Z',
    generatorVersion: 'fixture-generator-v1',
  }

  const level = adaptSceneDocumentToLevelDefinition(scene, {
    generatedCollisionProductsByActorId: new Map([
      [generatedProduct.actorId, generatedProduct],
    ]),
  })
  assert.equal(
    level.actors[0].physics?.collision.generatedProduct,
    generatedProduct,
  )

  const staleLevel = adaptSceneDocumentToLevelDefinition(scene, {
    generatedCollisionProductsByActorId: new Map([
      [
        generatedProduct.actorId,
        {
          ...generatedProduct,
          sourceMeshUrl: '/generated/runtime-game-assets/stale-asset.glb',
        },
      ],
    ]),
  })
  assert.equal(
    staleLevel.actors[0].physics?.collision.generatedProduct,
    undefined,
  )
})

test('failed generated collision can save but blocks publish', () => {
  const scene = createSceneAuthoredCollisionScene({
    collision: {
      mode: 'auto',
      quality: 'simplifiedMesh',
      intent: 'blocker',
      channel: 'worldStatic',
      maxTriangles: 5000,
      generationStatus: 'failed',
      generationLastError: 'Source mesh changed after last collision bake.',
    },
  })

  const editorValidation = validateEditorSceneDocument(scene)
  assert.equal(editorValidation.valid, true)

  const publishValidation = validatePublishableEditorSceneDocument(scene)
  assert.equal(publishValidation.valid, false)
  assert.ok(
    publishValidation.errors.some(error =>
      error.includes('collision generation status is failed'),
    ),
  )

  const review = reviewCollisionContracts({ scene })
  assert.ok(
    review.findings.some(
      finding =>
        finding.code === 'collision-generation-not-ready' &&
        finding.severity === 'error',
    ),
  )
})

test('collision lifecycle keeps authored baked mesh collision on scene load', () => {
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

  assert.equal(materialized.collision?.shape, 'trimesh')
  assert.equal(
    materialized.collision?.colliderUrl,
    '/generated/runtime-game-assets/collision/root-mound.glb',
  )
})

test('collision lifecycle preserves generated product metadata while stripping legacy source fields', () => {
  const currentNode: EditorSceneDocument['nodes'][number] = {
    id: 'generated-mesh',
    name: 'Generated Mesh',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: {
      url: '/generated/runtime-game-assets/generated-mesh.glb',
    },
  }

  const patch = applyCollisionLifecycleToPatch(currentNode, {
    collision: {
      mode: 'auto',
      quality: 'simplifiedMesh',
      intent: 'blocker',
      channel: 'worldStatic',
      generationStatus: 'failed',
      generationLastError: 'fixture failure',
      shape: 'trimesh',
      colliderUrl:
        '/generated/runtime-game-assets/collision/generated-mesh.collider.glb',
      colliderMetadataUrl:
        '/generated/runtime-game-assets/collision/generated-mesh.collider.meta.json',
      sourceAssetUrl: '/generated/runtime-game-assets/generated-mesh.glb',
      assetLocalTransform: null,
      triangleCount: 12,
      enabled: true,
      size: [1, 1, 1],
      lockToObject: true,
      triangleBudget: 99,
    },
  })

  assert.equal(patch.collision?.generationStatus, 'failed')
  assert.equal(patch.collision?.generationLastError, 'fixture failure')
  assert.equal(patch.collision?.shape, 'trimesh')
  assert.equal(
    patch.collision?.colliderUrl,
    '/generated/runtime-game-assets/collision/generated-mesh.collider.glb',
  )
  assert.equal(patch.collision?.sourceAssetUrl, currentNode.asset?.url)
  assert.equal(patch.collision?.triangleCount, 12)
  assert.equal(patch.collision?.maxTriangles, 99)
  assert.equal(patch.collision?.enabled, undefined)
  assert.equal(patch.collision?.size, undefined)
  assert.equal(patch.collision?.lockToObject, undefined)
  assert.equal(patch.collision?.triangleBudget, undefined)
})

function writePublicFixtureFile(
  publicRoot: string,
  publicUrl: string,
  body: string,
) {
  const filePath = join(publicRoot, publicUrl.replace(/^\/+/, ''))
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, body)
  return filePath
}

function createMeshProductFixture() {
  const publicRoot = mkdtempSync(join(tmpdir(), 'mesh-collision-products-'))
  const levelId = 'fixture-level'
  const sourceUrl = '/generated/runtime-game-assets/fixture.glb'
  const colliderUrl =
    '/generated/runtime-game-assets/collision/fixture-level/fixture-asset.collider.glb'
  const metadataUrl =
    '/generated/runtime-game-assets/collision/fixture-level/fixture-asset.collider.meta.json'
  writePublicFixtureFile(publicRoot, sourceUrl, 'source-v1')
  writePublicFixtureFile(publicRoot, colliderUrl, 'collider-v1')

  const node: EditorSceneDocument['nodes'][number] = {
    id: 'fixture-asset',
    name: 'Fixture Asset',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: {
      url: sourceUrl,
    },
    collision: {
      shape: 'trimesh',
      intent: 'blocker',
      channel: 'worldStatic',
      enabled: true,
      colliderUrl,
      colliderMetadataUrl: metadataUrl,
      triangleBudget: 10,
    },
  }
  const metadata = {
    triangleCount: 4,
    vertexCount: 6,
    bounds: {
      min: [0, 0, 0],
      max: [1, 1, 1],
      size: [1, 1, 1],
      center: [0.5, 0.5, 0.5],
    },
  }
  const product = createGeneratedCollisionProduct({
    levelId,
    node,
    publicRoot,
    metadata,
  })
  writePublicFixtureFile(
    publicRoot,
    metadataUrl,
    JSON.stringify(
      {
        schemaVersion: 3,
        generatedBy: 'mesh-collision-manager',
        generatedAt: '2026-05-14T00:00:00.000Z',
        sourceLevelId: levelId,
        sourceActorId: node.id,
        sourceAssetUrl: sourceUrl,
        sourceAssetFingerprint: product.sourceMeshFingerprint,
        colliderUrl,
        metadataUrl,
        triangleCount: metadata.triangleCount,
        vertexCount: metadata.vertexCount,
        bounds: metadata.bounds,
        collision: {
          shape: 'trimesh',
          intent: 'blocker',
          channel: 'worldStatic',
          triangleBudget: 10,
        },
        collisionProduct: product,
      },
      null,
      2,
    ),
  )
  return { publicRoot, levelId, node, sourceUrl, colliderUrl, metadataUrl }
}

test('generated collision products validate current source policy and transform fingerprints', () => {
  const fixture = createMeshProductFixture()
  const validation = validateGeneratedCollisionProduct({
    levelId: fixture.levelId,
    node: fixture.node,
    publicRoot: fixture.publicRoot,
    requireCurrentMetadata: true,
  })

  assert.deepEqual(validation.errors, [])
  assert.equal(validation.product?.actorId, fixture.node.id)
  assert.equal(validation.product?.artifactUrl, fixture.colliderUrl)
})

test('policy-only mesh products use generated trimesh shape instead of legacy cuboid', () => {
  const publicRoot = mkdtempSync(join(tmpdir(), 'policy-mesh-products-'))
  const levelId = 'fixture-level'
  const sourceUrl = '/generated/runtime-game-assets/fixture-policy.glb'
  const colliderUrl =
    '/generated/runtime-game-assets/collision/fixture-level/fixture-policy.collider.glb'
  const metadataUrl =
    '/generated/runtime-game-assets/collision/fixture-level/fixture-policy.collider.meta.json'
  writePublicFixtureFile(publicRoot, sourceUrl, 'source-v1')
  writePublicFixtureFile(publicRoot, colliderUrl, 'collider-v1')

  const node: EditorSceneDocument['nodes'][number] = {
    id: 'fixture-policy',
    name: 'Fixture Policy',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: {
      url: sourceUrl,
    },
    collision: {
      mode: 'auto',
      quality: 'simplifiedMesh',
      intent: 'blocker',
      channel: 'worldStatic',
      colliderUrl,
      colliderMetadataUrl: metadataUrl,
      maxTriangles: 12,
    },
  }
  const metadata = {
    triangleCount: 6,
    vertexCount: 8,
    bounds: {
      min: [0, 0, 0],
      max: [1, 1, 1],
      size: [1, 1, 1],
      center: [0.5, 0.5, 0.5],
    },
  }
  const product = createGeneratedCollisionProduct({
    levelId,
    node,
    publicRoot,
    metadata,
  })

  assert.equal(product.shape, 'trimesh')
  assert.notEqual(product.shape, 'cuboid')

  writePublicFixtureFile(
    publicRoot,
    metadataUrl,
    JSON.stringify(
      {
        schemaVersion: 3,
        generatedBy: 'mesh-collision-manager',
        generatedAt: '2026-05-14T00:00:00.000Z',
        sourceLevelId: levelId,
        sourceActorId: node.id,
        sourceAssetUrl: sourceUrl,
        sourceAssetFingerprint: product.sourceMeshFingerprint,
        colliderUrl,
        metadataUrl,
        triangleCount: metadata.triangleCount,
        vertexCount: metadata.vertexCount,
        bounds: metadata.bounds,
        collisionProduct: product,
      },
      null,
      2,
    ),
  )

  const validation = validateGeneratedCollisionProduct({
    levelId,
    node,
    publicRoot,
    requireCurrentMetadata: true,
  })
  assert.deepEqual(validation.errors, [])
  assert.equal(validation.product?.shape, 'trimesh')
  assert.equal(validation.product?.triangleBudget, 12)
})

test('policy-only mesh-derived collision is rejected until a generated artifact exists', () => {
  const publicRoot = mkdtempSync(join(tmpdir(), 'missing-mesh-product-'))
  const sourceUrl = '/generated/runtime-game-assets/fixture-policy.glb'
  writePublicFixtureFile(publicRoot, sourceUrl, 'source-v1')
  const node: EditorSceneDocument['nodes'][number] = {
    id: 'fixture-policy-asset',
    name: 'Fixture Policy Asset',
    kind: 'asset',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: {
      url: sourceUrl,
    },
    collision: {
      mode: 'auto',
      quality: 'simplifiedMesh',
      intent: 'blocker',
      channel: 'worldStatic',
      maxTriangles: 10,
    },
  }

  const validation = validateGeneratedCollisionProduct({
    levelId: 'fixture-level',
    node,
    publicRoot,
    requireCurrentMetadata: true,
  })

  assert.equal(validation.product, null)
  assert.ok(
    validation.errors.some((error: string) =>
      error.includes(
        'mesh-derived collision is missing a generated artifact URL',
      ),
    ),
  )
})

test('current generated collision metadata requires product fingerprints', () => {
  const fixture = createMeshProductFixture()
  writePublicFixtureFile(
    fixture.publicRoot,
    fixture.metadataUrl,
    JSON.stringify(
      {
        schemaVersion: 3,
        generatedBy: 'mesh-collision-manager',
        generatedAt: '2026-05-14T00:00:00.000Z',
        sourceLevelId: fixture.levelId,
        sourceActorId: fixture.node.id,
        sourceAssetUrl: fixture.sourceUrl,
        colliderUrl: fixture.colliderUrl,
        metadataUrl: fixture.metadataUrl,
        collisionProduct: {
          actorId: fixture.node.id,
          generatorVersion: 'mesh-collision-manager-v1',
        },
      },
      null,
      2,
    ),
  )

  const validation = validateGeneratedCollisionProduct({
    levelId: fixture.levelId,
    node: fixture.node,
    publicRoot: fixture.publicRoot,
    requireCurrentMetadata: true,
  })

  assert.ok(
    validation.errors.some((error: string) =>
      error.includes('source mesh fingerprint is missing'),
    ),
  )
  assert.ok(
    validation.errors.some((error: string) =>
      error.includes('transform fingerprint is missing'),
    ),
  )
  assert.ok(
    validation.errors.some((error: string) =>
      error.includes('policy fingerprint is missing'),
    ),
  )
  assert.ok(
    validation.errors.some((error: string) =>
      error.includes('product artifact URL is missing'),
    ),
  )
})

test('mesh URL change invalidates generated collision product', () => {
  const fixture = createMeshProductFixture()
  const changedUrl = '/generated/runtime-game-assets/fixture-changed.glb'
  writePublicFixtureFile(fixture.publicRoot, changedUrl, 'source-v2')
  const changedNode = {
    ...fixture.node,
    asset: {
      url: changedUrl,
    },
  }

  const validation = validateGeneratedCollisionProduct({
    levelId: fixture.levelId,
    node: changedNode,
    publicRoot: fixture.publicRoot,
    requireCurrentMetadata: true,
  })

  assert.ok(
    validation.errors.some((error: string) =>
      error.includes('source mesh URL is stale'),
    ),
  )
})

test('policy change invalidates generated collision product', () => {
  const fixture = createMeshProductFixture()
  const changedNode = {
    ...fixture.node,
    collision: {
      ...fixture.node.collision!,
      intent: 'walkable' as const,
    },
  }

  const validation = validateGeneratedCollisionProduct({
    levelId: fixture.levelId,
    node: changedNode,
    publicRoot: fixture.publicRoot,
    requireCurrentMetadata: true,
  })

  assert.ok(
    validation.errors.some((error: string) =>
      error.includes('policy fingerprint is stale'),
    ),
  )
})

test('scale change invalidates generated collision product transform fingerprint', () => {
  const fixture = createMeshProductFixture()
  const changedNode = {
    ...fixture.node,
    scale: [2, 1, 1] as [number, number, number],
  }

  const validation = validateGeneratedCollisionProduct({
    levelId: fixture.levelId,
    node: changedNode,
    publicRoot: fixture.publicRoot,
    requireCurrentMetadata: true,
  })

  assert.ok(
    validation.errors.some((error: string) =>
      error.includes('transform fingerprint is stale'),
    ),
  )
})

test('mode none omits generated collision product', () => {
  const fixture = createMeshProductFixture()
  const disabledNode = {
    ...fixture.node,
    collision: {
      ...fixture.node.collision!,
      enabled: false,
      intent: 'none' as const,
    },
  }

  const validation = validateGeneratedCollisionProduct({
    levelId: fixture.levelId,
    node: disabledNode,
    publicRoot: fixture.publicRoot,
    requireCurrentMetadata: true,
  })

  assert.deepEqual(validation.errors, [])
  assert.equal(validation.product, null)
})

test('publish build report rejects missing required generated collision product', () => {
  const publicRoot = mkdtempSync(join(tmpdir(), 'missing-collision-product-'))
  const scene = createSceneAuthoredCollisionScene({
    collision: {
      shape: 'trimesh',
      intent: 'blocker',
      channel: 'worldStatic',
      enabled: true,
      colliderUrl:
        '/generated/runtime-game-assets/collision/fixture-level/fixture-decor.collider.glb',
      colliderMetadataUrl:
        '/generated/runtime-game-assets/collision/fixture-level/fixture-decor.collider.meta.json',
      triangleBudget: 10,
    },
  })
  scene.settings!.level!.collision!.workflow = {
    colliderBudget: 'mobile',
    managerProductsRequired: true,
  } as any
  const collisionProductErrors: string[] = []
  const level = adaptRuntimeSceneDocumentToLevelDefinition(scene, {
    publicRoot,
    collisionProductErrors,
    requireCurrentGeneratedCollision: true,
  })
  const report = createRuntimeSceneLevelBuildReport(level, {
    collisionProductErrors,
  })

  assert.ok(
    report.errors.some((error: string) =>
      error.includes('generated collision artifact is missing'),
    ),
  )
})

test('generated asset add-to-scene records visual bounds for diagnostics', async () => {
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

test('scene settings normalization migrates legacy source GLB terrain visual source', () => {
  const settings = normalizeLevelSceneSettings('fixture-level', {
    level: {
      ground: {
        mode: 'terrain-chunks',
        visualSource: 'terrain-chunks',
        terrainRuntimeMode: 'glb-chunk-terrain',
        terrainVisualSource: 'source-glb-chunks',
        collisionSource: 'source-linked-terrain-collision',
        terrainManifestUrl: '/terrain/fixture-level.manifest.json',
        sourceAssetUrl: '/models/levels/fixture-level.glb',
      },
      collision: {
        terrain: {
          source: 'source-glb',
          runtimeMode: 'glb-chunk-terrain',
          visualSource: 'source-glb-chunks',
          manifestUrl: '/terrain/fixture-level.manifest.json',
          sourceAssetUrl: '/models/levels/fixture-level.glb',
        },
      },
    },
  })

  assert.equal(settings.level?.ground?.visualSource, 'source-glb-chunks')
})

test('scene settings normalization removes retired lighting fields', () => {
  const settings = normalizeLevelSceneSettings('fixture-level', {
    level: {
      lighting: {
        ambientIntensity: 0.2,
        sunIntensity: 0.42,
        fillIntensity: 0.26,
        fallbackAmbientIntensity: 4,
        fallbackMoonlightIntensity: 0.62,
        fallbackFillLightIntensity: 0.24,
      } as any,
    },
  })

  const lighting = settings.level?.lighting as Record<string, unknown>
  assert.equal(lighting.keyLightIntensity, 0.42)
  assert.equal(lighting.fillLightIntensity, 0.26)
  assert.equal(Object.hasOwn(lighting, 'sunIntensity'), false)
  assert.equal(Object.hasOwn(lighting, 'fillIntensity'), false)
  assert.equal(Object.hasOwn(lighting, 'fallbackAmbientIntensity'), false)
  assert.equal(Object.hasOwn(lighting, 'fallbackMoonlightIntensity'), false)
  assert.equal(Object.hasOwn(lighting, 'fallbackFillLightIntensity'), false)
})

test('packaged scene upgrade restores required render profile and source GLB terrain contract', () => {
  const upgraded = upgradeLegacySceneDocument({
    levelId: 'observatory',
    version: 1,
    updatedAt: '2026-05-16T00:00:00.000Z',
    settings: {
      level: {
        collision: {
          terrain: {
            source: 'source-glb',
            runtimeSource: 'built-in-manifest',
            runtimeMode: 'glb-chunk-terrain',
            visualSource: 'source-glb-chunks',
            manifestUrl: '/terrain/observatory-environment.manifest.json',
            dirty: false,
          },
        },
        terrainSculpt: {
          enabled: true,
          autoBakeCollision: true,
        },
        ground: {
          mode: 'terrain-chunks',
          visualSource: 'source-glb-chunks',
          collisionSource: 'source-linked-terrain-collision',
          terrainManifestUrl: '/terrain/observatory-environment.manifest.json',
        },
      },
    },
    nodes: [
      {
        id: 'observatory-ground-root',
        name: 'Observatory Grounds',
        kind: 'group',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
      },
    ],
  } satisfies EditorSceneDocument)

  assert.ok(upgraded.settings?.level?.renderProfile)
  assert.equal(
    upgraded.settings?.level?.collision?.terrain?.source,
    'source-glb',
  )
  assert.equal(
    upgraded.settings?.level?.ground?.visualSource,
    'source-glb-chunks',
  )
  assert.equal(upgraded.settings?.level?.terrainSculpt?.enabled, false)
})

test('scene complexity budgets warn without blocking publish validation', () => {
  const nodes: EditorSceneDocument['nodes'] = Array.from(
    { length: 81 },
    (_, index): EditorSceneDocument['nodes'][number] => ({
      id: `fixture-budget-primitive-${index}`,
      name: `Fixture Budget Primitive ${index}`,
      kind: 'primitive',
      position: [index % 9, 0, Math.floor(index / 9)] as [
        number,
        number,
        number,
      ],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      visible: true,
      primitive: {
        geometry: 'box',
        args: [1, 1, 1],
      },
      renderPolicy: {
        cullingPolicy: 'runtime-budget',
        physicsAttachment: 'inside-collider',
      },
      collision: {
        mode: 'auto',
        quality: 'primitive',
        intent: index === 0 ? 'walkable' : 'blocker',
        channel: 'worldStatic',
      },
    }),
  )
  const scene = createScene({
    nodes,
    settings: {
      level: {
        spawn: {
          position: [0, 1, 0],
          rotation: [0, 0, 0],
        },
        collision: {
          roles: {
            groundActorIds: ['fixture-budget-primitive-0'],
          },
          walkability: {
            supportMaxDrop: 2,
          },
        },
        ground: {
          mode: 'scene-authored',
          visualSource: 'scene-actors',
          terrainRuntimeMode: 'scene-authored',
          terrainVisualSource: 'scene-actors',
          collisionSource: 'scene-colliders',
          fallbackSurfacePolicy: 'disabled',
          groundActorIds: ['fixture-budget-primitive-0'],
        },
      },
    },
  })
  const level = adaptSceneDocumentToLevelDefinition(scene)

  const report = createLevelBuildReport(level)
  assert.deepEqual(report.errors, [])
  assert.ok(
    report.warnings.some(warning =>
      warning.includes('primitive render actors exceed contract budget'),
    ),
  )

  const runtimeSceneReport = createRuntimeSceneLevelBuildReport(level)
  assert.deepEqual(runtimeSceneReport.errors, [])
  assert.ok(
    runtimeSceneReport.warnings.some(warning =>
      warning.includes('primitive render actors exceed contract budget'),
    ),
  )

  const publishValidation = validatePublishableEditorSceneDocument(scene)
  assert.equal(publishValidation.valid, true)
  assert.deepEqual(publishValidation.errors, [])
  assert.ok(
    publishValidation.warnings.some(warning =>
      warning.includes('primitive render actors exceed contract budget'),
    ),
  )
})

test('runtime readiness contract captures required terrain and spawn gates', () => {
  const level = {
    id: 'observatory',
    version: 1,
    name: 'Observatory',
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
          terrainManifestUrl: '/terrain/observatory-environment.manifest.json',
          sourceAssetUrl: '/models/levels/observatory-environment.glb',
          sourceAssetHash: fixtureSourceFingerprint.value,
        },
        collision: {
          terrain: {
            source: 'source-glb',
            runtimeMode: 'glb-chunk-terrain',
            visualSource: 'source-glb-chunks',
            fallbackSurfacePolicy: 'disabled',
            manifestUrl: '/terrain/observatory-environment.manifest.json',
            sourceAssetUrl: '/models/levels/observatory-environment.glb',
            sourceAssetHash: fixtureSourceFingerprint.value,
          },
        },
      },
    },
  }

  const readiness = createLevelRuntimeReadinessContract(level)

  assert.equal(readiness.schemaVersion, 2)
  assert.equal(Object.hasOwn(readiness, 'requiredRenderActorIds'), false)
  assert.equal(Object.hasOwn(readiness, 'requiredCollisionActorIds'), false)
  assert.equal(Object.hasOwn(readiness, 'requiredAssetUrls'), false)
  assert.equal(Object.hasOwn(readiness, 'requiredColliderUrls'), false)
  assert.equal(Object.hasOwn(readiness, 'requiredInitialCellKeys'), false)
  assert.equal(readiness.spawn.valid, true)
  assert.equal(readiness.spawn.satisfiedByRuntimeSystem, true)
  assert.equal(readiness.terrain.runtimeCollision, true)
  assert.equal(readiness.terrain.satisfiedByRuntimeSystem, true)
  assert.equal(readiness.publish.ready, true)
  assert.equal(readiness.runtime.requiredTerrain, true)
  assert.deepEqual(readiness.runtime.requiredCollisionActorIds, [
    'observatory-terrain',
  ])
  assert.deepEqual(readiness.requiredActorIds, [
    'observatory-terrain',
    'observatory-player-spawn',
  ])
  assert.deepEqual(readiness.missingRequiredActorIds, [])

  const blockedActivation = evaluateLevelRuntimeActivation(readiness, {
    manifestLoaded: true,
    spawnResolved: true,
    terrainCollisionMounted: true,
  })
  assert.equal(blockedActivation.ready, false)
  assert.ok(
    blockedActivation.blockers.some(blocker =>
      blocker.includes('Physics world is not ready'),
    ),
  )

  const readyActivation = evaluateLevelRuntimeActivation(readiness, {
    manifestLoaded: true,
    requiredRenderAssetsLoaded: true,
    requiredRenderActorsMounted: true,
    requiredCollisionMounted: true,
    terrainCollisionMounted: true,
    spawnResolved: true,
    physicsWorldReady: true,
    playerBodyReady: true,
    gameplayEnabled: true,
  })
  assert.equal(readyActivation.ready, true)
  assert.deepEqual(readyActivation.blockers, [])

  const report = createLevelBuildReport(level)
  assert.deepEqual(report.runtimeReadinessContract, readiness)

  const runtimeSceneReport = createRuntimeSceneLevelBuildReport(level)
  assert.deepEqual(runtimeSceneReport.runtimeReadinessContract, readiness)
  assert.equal(
    Object.hasOwn(runtimeSceneReport, 'requiredRenderActorIds'),
    false,
  )
  assert.equal(Object.hasOwn(runtimeSceneReport, 'requiredAssetUrls'), false)
  assert.equal(Object.hasOwn(runtimeSceneReport, 'runtimeAssetUrls'), false)
})

test('walkability support policy allows elevated spawn over authored pad', () => {
  const createLevel = (supportMaxDrop: number): LevelDefinition => ({
    id: 'fixture-level',
    version: 1,
    title: 'Fixture Level',
    spawn: {
      player: [0, 4.1, 0] as [number, number, number],
    },
    actors: [
      {
        id: 'fixture-spawn-pad',
        name: 'Fixture Spawn Pad',
        kind: 'primitive',
        transform: {
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
        render: {
          visible: true,
          cullingPolicy: 'runtime-budget',
          physicsAttachment: 'inside-collider',
          primitive: {
            geometry: 'box',
            args: [8, 0.4, 8],
          },
        },
        physics: {
          bodyType: 'fixed',
          collision: {
            shape: 'cuboid',
            size: [8, 0.4, 8] as [number, number, number],
            intent: 'walkable',
            channel: 'worldStatic',
          },
        },
      },
    ],
    settings: {
      level: {
        collision: {
          roles: {
            groundActorIds: ['fixture-spawn-pad'],
          },
          walkability: {
            supportMaxDrop,
          },
        },
        ground: {
          mode: 'scene-authored',
          visualSource: 'scene-actors',
          terrainRuntimeMode: 'scene-authored',
          terrainVisualSource: 'scene-actors',
          collisionSource: 'scene-colliders',
          fallbackSurfacePolicy: 'disabled',
          groundActorIds: ['fixture-spawn-pad'],
        },
      },
    },
  })

  const strictReport = createLevelBuildReport(createLevel(1))
  assert.match(
    strictReport.errors.join('\n'),
    /Walkability sample "player-spawn" does not land on authored walkable collision\./,
  )

  const relaxedLevel = createLevel(4)
  const report = createLevelBuildReport(relaxedLevel)
  const runtimeSceneReport = createRuntimeSceneLevelBuildReport(relaxedLevel)

  assert.deepEqual(report.errors, [])
  assert.deepEqual(runtimeSceneReport.errors, [])
})

test('runtime readiness contract covers scene-authored primitive floor activation', () => {
  const level: LevelDefinition = {
    id: 'fixture-level',
    version: 1,
    title: 'Fixture Level',
    spawn: {
      player: [0, 1.1, 0] as [number, number, number],
    },
    actors: [
      {
        id: 'fixture-ground',
        name: 'Fixture Ground',
        kind: 'primitive',
        transform: {
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
        render: {
          visible: true,
          cullingPolicy: 'runtime-budget',
          physicsAttachment: 'inside-collider',
          primitive: {
            geometry: 'box',
            args: [8, 0.4, 8],
          },
        },
        physics: {
          bodyType: 'fixed',
          collision: {
            shape: 'cuboid',
            size: [8, 0.4, 8] as [number, number, number],
            intent: 'walkable',
            channel: 'worldStatic',
            generatedProduct: {
              actorId: 'fixture-ground',
              mode: 'auto',
              productId: 'fixture-ground:auto:primitive',
              sourceKind: 'primitive',
              sourceMeshFingerprint: 'fixture-ground-source',
              transformFingerprint: 'fixture-ground-transform',
              policyFingerprint: 'fixture-ground-policy',
              shape: 'cuboid',
              localBounds: {
                min: [-4, -0.2, -4],
                max: [4, 0.2, 4],
                size: [8, 0.4, 8],
                center: [0, 0, 0],
              },
              generatedAt: '2026-05-13T00:00:00.000Z',
              generatorVersion: 'fixture-generator-v1',
            },
          },
        },
      },
      {
        id: 'fixture-required-asset',
        name: 'Fixture Required Asset',
        kind: 'asset',
        transform: {
          position: [2, 0.5, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
        render: {
          visible: true,
          cullingPolicy: 'runtime-budget',
          physicsAttachment: 'outside-collider',
          asset: {
            url: '/generated/runtime-game-assets/fixture-required.glb',
          },
        },
      },
      {
        id: 'fixture-required-collider',
        name: 'Fixture Required Collider',
        kind: 'asset',
        transform: {
          position: [-2, 0.5, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
        render: {
          visible: true,
          cullingPolicy: 'runtime-budget',
          physicsAttachment: 'outside-collider',
          asset: {
            url: '/generated/runtime-game-assets/fixture-collider-visual.glb',
          },
        },
        physics: {
          bodyType: 'fixed',
          collision: {
            shape: 'trimesh',
            intent: 'blocker',
            channel: 'worldStatic',
            colliderUrl:
              '/generated/runtime-game-assets/collision/fixture-required-collider.collider.glb',
            colliderMetadataUrl:
              '/generated/runtime-game-assets/collision/fixture-required-collider.collider.json',
            triangleBudget: 500,
            generatedProduct: {
              actorId: 'fixture-required-collider',
              mode: 'auto',
              productId: 'fixture-required-collider:auto:simplifiedMesh',
              sourceKind: 'asset',
              sourceMeshUrl:
                '/generated/runtime-game-assets/fixture-collider-visual.glb',
              sourceMeshFingerprint: 'fixture-required-collider-source',
              transformFingerprint: 'fixture-required-collider-transform',
              policyFingerprint: 'fixture-required-collider-policy',
              shape: 'trimesh',
              artifactUrl:
                '/generated/runtime-game-assets/collision/fixture-required-collider.collider.glb',
              metadataUrl:
                '/generated/runtime-game-assets/collision/fixture-required-collider.collider.json',
              localBounds: {
                min: [-0.5, -0.5, -0.5],
                max: [0.5, 0.5, 0.5],
                size: [1, 1, 1],
                center: [0, 0, 0],
              },
              triangleCount: 120,
              vertexCount: 80,
              triangleBudget: 500,
              generatedAt: '2026-05-13T00:00:00.000Z',
              generatorVersion: 'fixture-generator-v1',
            },
          },
        },
      },
    ],
    settings: {
      level: {
        runtimeAssets: {
          requiredActorIds: [
            'fixture-ground',
            'fixture-required-collider',
            'fixture-level-player-spawn',
          ],
          requiredRenderActorIds: ['fixture-required-asset'],
        },
        ground: {
          mode: 'scene-authored',
          visualSource: 'scene-actors',
          terrainRuntimeMode: 'scene-authored',
          terrainVisualSource: 'scene-actors',
          collisionSource: 'scene-colliders',
          fallbackSurfacePolicy: 'disabled',
          groundActorIds: ['fixture-ground'],
        },
      },
    },
  }

  const readiness = createLevelRuntimeReadinessContract(level)

  assert.equal(readiness.publish.ready, true)
  assert.equal(readiness.spawn.valid, true)
  assert.equal(readiness.spawn.satisfiedByRuntimeSystem, true)
  assert.equal(readiness.terrain.runtimeCollision, false)
  assert.equal(readiness.terrain.satisfiedByRuntimeSystem, false)
  assert.deepEqual(readiness.requiredActorIds, [
    'fixture-ground',
    'fixture-required-collider',
    'fixture-level-player-spawn',
  ])
  assert.deepEqual(readiness.runtime.requiredRenderActorIds, [
    'fixture-required-asset',
  ])
  assert.deepEqual(readiness.runtime.requiredAssetUrls, [
    '/generated/runtime-game-assets/fixture-required.glb',
  ])
  assert.deepEqual(readiness.runtimeAssetUrls, [
    '/generated/runtime-game-assets/fixture-collider-visual.glb',
    '/generated/runtime-game-assets/fixture-required.glb',
  ])
  assert.deepEqual(readiness.missingRequiredActorIds, [])
  assert.deepEqual(readiness.runtime.requiredCollisionActorIds, [
    'fixture-ground',
    'fixture-required-collider',
  ])
  assert.deepEqual(readiness.runtime.requiredColliderUrls, [
    '/generated/runtime-game-assets/collision/fixture-required-collider.collider.glb',
  ])
  assert.deepEqual(readiness.requiredWalkableActorIds, [])

  const activation = evaluateLevelRuntimeActivation(readiness, {
    manifestLoaded: true,
    loadedAssetUrls: ['/generated/runtime-game-assets/fixture-required.glb'],
    mountedRenderActorIds: ['fixture-required-asset'],
    mountedCollisionActorIds: ['fixture-ground', 'fixture-required-collider'],
    loadedColliderUrls: [
      '/generated/runtime-game-assets/collision/fixture-required-collider.collider.glb',
    ],
    spawnResolved: true,
    physicsWorldReady: true,
    playerBodyReady: true,
    gameplayEnabled: true,
  })
  assert.equal(activation.ready, true)

  const report = createLevelBuildReport(level)
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.warnings, [])
  assert.deepEqual(report.runtimeReadinessContract, readiness)

  const runtimeSceneReport = createRuntimeSceneLevelBuildReport(level)
  assert.deepEqual(runtimeSceneReport.runtimeReadinessContract, readiness)

  const manifest = createRuntimeSceneManifest({
    scene: createScene({ levelId: level.id }) as any,
    sceneId: level.id,
    sourcePath: '/src/threlte/editor/scenes/fixture-level.scene.json',
    levelDefinition: level,
    buildReport: {
      ...report,
    },
    generatedAt: '2026-05-13T00:00:00.000Z',
  })
  assert.deepEqual(manifest.runtime.requiredAssetUrls, [
    '/generated/runtime-game-assets/fixture-required.glb',
  ])
  assert.deepEqual(getRuntimeSceneRequiredAssetUrls(manifest), [
    '/generated/runtime-game-assets/fixture-required.glb',
  ])
  assert.deepEqual(getRuntimeSceneRuntimeAssetUrls(manifest), [
    '/generated/runtime-game-assets/fixture-collider-visual.glb',
    '/generated/runtime-game-assets/fixture-required.glb',
  ])
  assert.deepEqual(validateRuntimeSceneManifest(manifest, level.id).errors, [])
})

test('runtime readiness contract reports required collider urls', () => {
  const level: LevelDefinition = {
    id: 'fixture-level',
    version: 1,
    title: 'Fixture Level',
    spawn: {
      player: [0, 1, 0] as [number, number, number],
    },
    actors: [
      {
        id: 'fixture-collision-mesh',
        name: 'Fixture Collision Mesh',
        kind: 'asset',
        transform: {
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
        render: {
          visible: true,
          cullingPolicy: 'runtime-budget',
          physicsAttachment: 'outside-collider',
          asset: {
            url: '/generated/runtime-game-assets/fixture-collision-mesh.glb',
          },
        },
        physics: {
          bodyType: 'fixed',
          collision: {
            shape: 'trimesh',
            intent: 'blocker',
            channel: 'worldStatic',
            colliderUrl:
              '/generated/runtime-game-assets/collision/fixture-collision-mesh.collider.glb',
            colliderMetadataUrl:
              '/generated/runtime-game-assets/collision/fixture-collision-mesh.collider.meta.json',
            triangleBudget: 128,
          },
        },
      },
    ],
    settings: {
      level: {
        runtimeAssets: {
          requiredActorIds: [
            'fixture-collision-mesh',
            'fixture-level-player-spawn',
          ],
        },
      },
    },
  }

  const readiness = createLevelRuntimeReadinessContract(level)

  assert.deepEqual(readiness.runtime.requiredCollisionActorIds, [
    'fixture-collision-mesh',
  ])
  assert.deepEqual(readiness.runtime.requiredColliderUrls, [
    '/generated/runtime-game-assets/collision/fixture-collision-mesh.collider.glb',
  ])
  assert.deepEqual(
    readiness.publish.gates.find(
      gate => gate.id === 'required-collision-present',
    )?.evidence.colliderUrls,
    readiness.runtime.requiredColliderUrls,
  )
})

test('asset actors can use authored simple collision without baked mesh collider requirements', () => {
  const level: LevelDefinition = {
    id: 'fixture-level',
    version: 1,
    title: 'Fixture Level',
    spawn: {
      player: [0, 1, 0] as [number, number, number],
    },
    actors: [
      {
        id: 'fixture-ground',
        name: 'Fixture Ground',
        kind: 'primitive',
        transform: {
          position: [0, -0.25, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
        render: {
          visible: true,
          cullingPolicy: 'runtime-budget',
          physicsAttachment: 'inside-collider',
          primitive: {
            geometry: 'box',
            args: [8, 0.5, 8],
          },
        },
        physics: {
          bodyType: 'fixed',
          collision: {
            shape: 'cuboid',
            size: [8, 0.5, 8] as [number, number, number],
            intent: 'walkable',
            channel: 'worldStatic',
          },
        },
      },
      {
        id: 'fixture-glb-blockout',
        name: 'Fixture GLB Blockout',
        kind: 'asset',
        transform: {
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
        render: {
          visible: true,
          cullingPolicy: 'runtime-budget',
          physicsAttachment: 'outside-collider',
          asset: {
            url: '/generated/runtime-game-assets/fixture-glb-blockout.glb',
          },
        },
        physics: {
          bodyType: 'fixed',
          collision: {
            shape: 'cuboid',
            size: [4, 3, 0.5] as [number, number, number],
            intent: 'blocker',
            channel: 'worldStatic',
          },
        },
      },
    ],
    settings: {
      level: {
        runtimeAssets: {
          requiredActorIds: [
            'fixture-ground',
            'fixture-glb-blockout',
            'fixture-level-player-spawn',
          ],
        },
        ground: {
          mode: 'scene-authored',
          visualSource: 'scene-actors',
          terrainRuntimeMode: 'scene-authored',
          terrainVisualSource: 'scene-actors',
          collisionSource: 'scene-colliders',
          fallbackSurfacePolicy: 'disabled',
          groundActorIds: ['fixture-ground'],
        },
      },
    },
  }

  const readiness = createLevelRuntimeReadinessContract(level)

  assert.ok(
    readiness.runtime.requiredCollisionActorIds.includes(
      'fixture-glb-blockout',
    ),
  )
  assert.deepEqual(readiness.runtime.requiredColliderUrls, [])
  assert.equal(readiness.publish.ready, true)

  const report = createLevelBuildReport(level)
  assert.deepEqual(report.errors, [])

  const runtimeSceneReport = createRuntimeSceneLevelBuildReport(level)
  assert.deepEqual(runtimeSceneReport.errors, [])
  assert.deepEqual(runtimeSceneReport.runtimeReadinessContract, readiness)
})

test('runtime readiness contract reports world partition initial cells', () => {
  const level: LevelDefinition = {
    id: 'fixture-level',
    version: 1,
    title: 'Fixture Level',
    spawn: {
      player: [0, 1, 0] as [number, number, number],
    },
    actors: [],
    settings: {
      level: {},
    },
  }

  const readiness = createLevelRuntimeReadinessContract(level, {
    requiredInitialCellKeys: ['1:0'],
    worldPartitionReadiness: {
      requiredInitialCellKeys: ['0:0', '1:0', '0:0'],
    },
  })

  assert.deepEqual(readiness.runtime.requiredInitialCellKeys, ['0:0', '1:0'])
  assert.ok(
    readiness.runtime.requiredGateIds.includes(
      'required-initial-world-partition-cells-ready',
    ),
  )

  const blocked = evaluateLevelRuntimeActivation(readiness, {
    manifestLoaded: true,
    requiredRenderAssetsLoaded: true,
    requiredRenderActorsMounted: true,
    requiredCollisionMounted: true,
    spawnResolved: true,
    physicsWorldReady: true,
    playerBodyReady: true,
    gameplayEnabled: true,
  })
  assert.equal(blocked.ready, false)
  assert.ok(
    blocked.blockers.some(blocker =>
      blocker.includes('required initial world partition cell'),
    ),
  )

  const failed = evaluateLevelRuntimeActivation(readiness, {
    manifestLoaded: true,
    requiredRenderAssetsLoaded: true,
    requiredRenderActorsMounted: true,
    requiredCollisionMounted: true,
    activeInitialCellKeys: ['0:0'],
    readyInitialCellKeys: ['1:0'],
    failedInitialCellKeys: ['0:0'],
    spawnResolved: true,
    physicsWorldReady: true,
    playerBodyReady: true,
    gameplayEnabled: true,
  })
  assert.equal(failed.ready, false)

  const ready = evaluateLevelRuntimeActivation(readiness, {
    manifestLoaded: true,
    requiredRenderAssetsLoaded: true,
    requiredRenderActorsMounted: true,
    requiredCollisionMounted: true,
    activeInitialCellKeys: ['0:0'],
    readyInitialCellKeys: ['1:0'],
    spawnResolved: true,
    physicsWorldReady: true,
    playerBodyReady: true,
    gameplayEnabled: true,
  })
  assert.equal(ready.ready, true)
})

test('runtime readiness contract rejects legacy requiredAssetActorIds input', () => {
  const level = {
    id: 'fixture-level',
    version: 1,
    title: 'Fixture Level',
    spawn: {
      player: [0, 1, 0] as [number, number, number],
    },
    actors: [],
    settings: {
      level: {
        runtimeAssets: {
          requiredAssetActorIds: ['legacy-required-render-actor'],
        },
      },
    },
  } as LevelDefinition

  const readiness = createLevelRuntimeReadinessContract(level)
  assert.equal(readiness.publish.ready, false)
  assert.ok(
    readiness.publish.blockers.some(blocker =>
      blocker.includes('requiredAssetActorIds'),
    ),
  )
  assert.deepEqual(readiness.runtime.requiredRenderActorIds, [])

  const report = createLevelBuildReport(level)
  assert.ok(
    report.errors.some(error => error.includes('requiredAssetActorIds')),
  )
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

test('legacy authored-ground ground mode is rejected for publish', () => {
  const scene = createSceneAuthoredCollisionScene()
  scene.settings!.level!.ground!.mode = 'authored-ground' as any

  const publishValidation = validatePublishableEditorSceneDocument(scene)
  assert.equal(publishValidation.valid, false)
  assert.ok(
    publishValidation.errors.some(error =>
      error.includes('ground.mode "authored-ground" is invalid'),
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
            source: 'scene-authored',
            runtimeMode: 'scene-authored',
            visualSource: 'none',
            manifestUrl: '/terrain/obsolete-fixture.manifest.json',
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
  assert.equal(pipeline.hasCollider, false)
  assert.equal(
    pipeline.commands.find(command => command.id === 'bake-terrain-collision')
      ?.enabled,
    false,
  )
  assert.equal(plan.steps.includes('bake-terrain-collision'), false)
  assert.equal(plan.steps.includes('cook-terrain-glb-chunks'), false)
})

test('imported Blender terrain source switches the level to GLB chunk terrain', () => {
  const settings = applyTerrainSourceImportPayload(
    {
      ground: {
        mode: 'scene-authored',
        visualSource: 'scene-actors',
        collisionSource: 'scene-colliders',
      },
      collision: {
        terrain: {
          source: 'scene-authored',
          chunksPath: '/terrain/levels/old/',
          chunkCount: 4,
          colliderUrl: '/terrain/collision/old.collider.bin',
          metadataUrl: '/terrain/collision/old.collider.meta.json',
        },
      },
    },
    {
      manifestUrl: '/terrain/fixture-level.manifest.json',
      sourceAssetUrl: '/models/levels/fixture-level/blender-terrain.glb',
      sourceAssetHash: 'abc123',
      sourceAssetFingerprint: {
        algorithm: 'sha256',
        value: 'abc123',
      },
      sourceName: 'blender-terrain.glb',
    },
  )
  const scene = createScene({
    settings: { level: settings },
  })
  const pipeline = describeEditorTerrainPipeline({ scene })

  assert.equal(settings.collision?.terrain?.source, 'source-glb')
  assert.equal(settings.collision?.terrain?.runtimeMode, 'glb-chunk-terrain')
  assert.equal(settings.collision?.terrain?.visualSource, 'source-glb-chunks')
  assert.equal(settings.collision?.terrain?.chunksPath, undefined)
  assert.equal(settings.collision?.terrain?.colliderUrl, undefined)
  assert.equal(settings.ground?.collisionSource, 'source-linked-terrain-collision')
  assert.equal(pipeline.mode, 'glb-chunk-terrain')
  assert.equal(
    pipeline.commands.find(command => command.id === 'cook-glb-chunks')
      ?.enabled,
    true,
  )
})

test('editor terrain import route copies a Blender GLB source into public terrain assets', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'terrain-import-repo-'))
  const publicRoot = join(repoRoot, 'apps/megameal/public')
  const sourceRoot = join(repoRoot, 'blender-export')
  mkdirSync(sourceRoot, { recursive: true })
  const sourcePath = join(sourceRoot, 'observatory-terrain.glb')
  writeFileSync(sourcePath, 'fixture glb bytes')

  const route = {
    pathname: '/api/editor-terrain/import-source',
    parsedUrl: { query: {} },
  }
  const req = createJsonRequest(route.pathname, {
    levelId: 'observatory',
    sourcePath,
  })
  const { done, res } = createJsonResponse()
  const handled = handleTerrainRoutes(
    req,
    res,
    route,
    createTerrainRouteContext(publicRoot, repoRoot),
  )
  const response = await done

  assert.equal(handled, true)
  assert.equal(response.status, 200)
  assert.equal(response.payload.success, true)
  assert.match(
    String(response.payload.sourceAssetUrl),
    /^\/models\/levels\/observatory\/observatory-terrain-/,
  )
  assert.equal(response.payload.copied, true)
  assert.equal(
    typeof (response.payload.sourceAssetFingerprint as any)?.value,
    'string',
  )
})

test('editor terrain import route accepts an existing public GLB URL', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'terrain-import-public-'))
  const publicRoot = join(repoRoot, 'apps/megameal/public')
  const publicAssetPath = join(publicRoot, 'models/levels/source.glb')
  mkdirSync(dirname(publicAssetPath), { recursive: true })
  writeFileSync(publicAssetPath, 'fixture public glb bytes')

  const route = {
    pathname: '/api/editor-terrain/import-source',
    parsedUrl: { query: {} },
  }
  const req = createJsonRequest(route.pathname, {
    levelId: 'observatory',
    sourcePath: '/models/levels/source.glb',
  })
  const { done, res } = createJsonResponse()
  const handled = handleTerrainRoutes(
    req,
    res,
    route,
    createTerrainRouteContext(publicRoot, repoRoot),
  )
  const response = await done

  assert.equal(handled, true)
  assert.equal(response.status, 200)
  assert.equal(response.payload.success, true)
  assert.equal(response.payload.sourceAssetUrl, '/models/levels/source.glb')
  assert.equal(response.payload.copied, false)
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
        collisionBakeMode: 'source-glb-collision-mesh',
        collisionCoverageBounds: fixtureBounds,
        role: 'walkable',
        vertexCount: 128,
        triangleCount: 64,
      },
    },
    collision: {
      terrain: {
        type: 'baked-terrain-mesh',
        sourceLinked: true,
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
          sourceCoordinateSystem: 'three-y-up-xz-ground',
          sourceBounds: fixtureBounds,
          renderBakeMode: 'source-glb-chunk-mesh',
          collisionBakeMode: 'source-glb-collision-mesh',
          collisionMeshSource: {
            type: 'source-glb',
            url: '/models/levels/fixture-level.glb',
            fingerprint: fixtureSourceFingerprint,
          },
          collisionCoverageBounds: fixtureBounds,
          role: 'walkable',
          vertexCount: 81,
          triangleCount: 128,
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

function createTerrainRouteContext(publicRoot: string, repoRoot: string) {
  const terrainRoot = join(publicRoot, 'terrain')
  return {
    GAME_PUBLIC_ROOT: publicRoot,
    REPO_ROOT: repoRoot,
    ensureTerrainManifestForLevel(levelId: string) {
      mkdirSync(terrainRoot, { recursive: true })
      const manifestPath = join(terrainRoot, `${levelId}.manifest.json`)
      writeFileSync(
        manifestPath,
        `${JSON.stringify({ id: levelId, assets: {} }, null, 2)}\n`,
      )
      return manifestPath
    },
    getEditorScenePath(levelId: string) {
      return join(repoRoot, `${levelId}.scene.json`)
    },
    getTerrainManifestPathForLevel(levelId: string) {
      return join(terrainRoot, `${levelId}.manifest.json`)
    },
    readJsonFile(path: string) {
      return JSON.parse(readFileSync(path, 'utf8'))
    },
    resolvePublicAssetPath(assetUrl: string) {
      return join(publicRoot, assetUrl.replace(/^\/+/, ''))
    },
    toPublicAssetUrl(path: string) {
      return `/${path
        .slice(publicRoot.length)
        .replace(/^[\\/]+/, '')
        .replace(/\\/g, '/')}`
    },
    toRepoRelative(path: string) {
      return path
    },
  }
}

function writeFixtureFile(filePath: string, contents = 'fixture') {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}

function getArgValue(args: string[], key: string) {
  const index = args.indexOf(key)
  return index >= 0 ? args[index + 1] : ''
}

function toFixturePublicUrl(publicDir: string, filePath: string) {
  return `/${filePath
    .slice(publicDir.length)
    .replace(/^\/+/, '')
    .replace(/\\/g, '/')}`
}

function createStyleRouteContext(publicDir: string, overrides = {}) {
  return {
    GENERATED_STYLE_LAB_ROOT: join(publicDir, 'generated/style-lab'),
    buildSafeAssetSlug: (value: string, maxLength = 80) =>
      String(value)
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLength) || 'style-bake',
    copyModelToGlb: async (_sourcePath: string, outputPath: string) => {
      writeFixtureFile(outputPath, 'copied glb')
    },
    detectBlenderExecutable: () => '/usr/bin/blender',
    ensureDirectory: (directory: string) => {
      mkdirSync(directory, { recursive: true })
    },
    formatBytes: (value: number) => `${value} B`,
    inspectGltfAsset: async () => 'fixture inspect report',
    resolveInspectableModelAsset: (assetUrl: string) => {
      const assetPath = join(publicDir, assetUrl.replace(/^\//, ''))
      return {
        assetName: 'fixture-source',
        assetPath,
      }
    },
    runGltfTransform: async (args: string[]) => {
      const outputPath = args[2]
      writeFixtureFile(outputPath, 'pruned glb')
      return { code: 0, stdout: '', stderr: '' }
    },
    runStyleBakeAsset: async (args: string[]) => {
      const metadataPath = getArgValue(args, '--metadata-output')
      writeFixtureFile(
        metadataPath,
        JSON.stringify({
          generatedBy: 'fixture procedural style bake',
          generator: 'Merkin deterministic procedural style bake',
        }),
      )
      return { code: 0, stdout: '', stderr: '' }
    },
    toPublicAssetUrl: (filePath: string) =>
      toFixturePublicUrl(publicDir, filePath),
    toRepoRelative: (filePath: string) => filePath,
    ...overrides,
  }
}

test('procedural style bake route returns selected-object product metadata', async () => {
  const publicDir = mkdtempSync(join(tmpdir(), 'style-bake-route-'))
  const sourceAssetUrl = '/generated/style-lab/sources/fixture/source.glb'
  writeFixtureFile(
    join(publicDir, sourceAssetUrl.replace(/^\//, '')),
    'source glb',
  )
  const req = createJsonRequest('/api/style/bake-procedural', {
    assetUrl: sourceAssetUrl,
    levelId: 'fixture-level',
    nodeId: 'fixture-style-actor',
    outputName: 'Fixture Style Actor',
    styleProfileName: 'Fixture Style',
    prompt: 'fixture prompt',
    textureSize: 256,
  })
  const { done, res } = createJsonResponse()

  await handleStyleRoutes(
    req,
    res,
    { pathname: '/api/style/bake-procedural', parsedUrl: { query: {} } },
    createStyleRouteContext(publicDir),
  )
  const response = await done
  const product = response.payload.product as Record<string, any>

  assert.equal(response.status, 200)
  assert.equal(response.payload.success, true)
  assert.equal(product.schemaVersion, 1)
  assert.equal(product.mode, 'procedural-material')
  assert.equal(product.sourceAssetUrl, sourceAssetUrl)
  assert.equal(product.source.nodeId, 'fixture-style-actor')
  assert.equal(product.source.levelId, 'fixture-level')
  assert.equal(product.generatedAssetUrl, response.payload.assetUrl)
  assert.equal(product.generatedMetadataUrl, response.payload.metadataUrl)
  assert.equal(product.state.status, 'ready')
  assert.equal(product.status, 'clean')
  assert.ok(product.sourceAssetFingerprint.value)
  assert.ok(product.settingsFingerprint.value)
  assert.ok(product.cacheKey)
  assert.equal(
    product.cacheKey,
    getStyleBakeCacheKey({
      sourceAssetUrl,
      sourceAssetFingerprint: product.sourceAssetFingerprint,
      levelId: 'fixture-level',
      nodeId: 'fixture-style-actor',
      sourceNodeTransform: null,
      sourceLocalBounds: null,
      settingsFingerprint: product.settingsFingerprint,
      mode: 'procedural-material',
      generator: styleBakeProceduralGenerator,
    }),
  )
})

test('procedural style bake route rejects stale style settings fingerprint', async () => {
  const publicDir = mkdtempSync(join(tmpdir(), 'style-bake-route-'))
  const sourceAssetUrl = '/generated/style-lab/sources/fixture/source.glb'
  writeFixtureFile(
    join(publicDir, sourceAssetUrl.replace(/^\//, '')),
    'source glb',
  )
  let bakeCalled = false
  const req = createJsonRequest('/api/style/bake-procedural', {
    assetUrl: sourceAssetUrl,
    styleProfileName: 'Fixture Style',
    prompt: 'fixture prompt',
    textureSize: 256,
    settingsFingerprint: {
      algorithm: 'fnv1a64',
      value: '0'.repeat(16),
    },
  })
  const { done, res } = createJsonResponse()

  await handleStyleRoutes(
    req,
    res,
    { pathname: '/api/style/bake-procedural', parsedUrl: { query: {} } },
    createStyleRouteContext(publicDir, {
      runStyleBakeAsset: async () => {
        bakeCalled = true
        return { code: 0, stdout: '', stderr: '' }
      },
    }),
  )
  const response = await done

  assert.equal(response.status, 409)
  assert.equal(response.payload.success, false)
  assert.match(
    String(response.payload.message),
    /settings fingerprint mismatch/,
  )
  assert.equal(bakeCalled, false)
})

test('procedural style bake route rejects stale cache key assertions', async () => {
  const publicDir = mkdtempSync(join(tmpdir(), 'style-bake-route-'))
  const sourceAssetUrl = '/generated/style-lab/sources/fixture/source.glb'
  writeFixtureFile(
    join(publicDir, sourceAssetUrl.replace(/^\//, '')),
    'source glb',
  )
  let bakeCalled = false
  const req = createJsonRequest('/api/style/bake-procedural', {
    assetUrl: sourceAssetUrl,
    styleProfileName: 'Fixture Style',
    prompt: 'fixture prompt',
    textureSize: 256,
    cacheKey: 'style-bake:procedural-material:stale-cache-key',
  })
  const { done, res } = createJsonResponse()

  await handleStyleRoutes(
    req,
    res,
    { pathname: '/api/style/bake-procedural', parsedUrl: { query: {} } },
    createStyleRouteContext(publicDir, {
      runStyleBakeAsset: async () => {
        bakeCalled = true
        return { code: 0, stdout: '', stderr: '' }
      },
    }),
  )
  const response = await done

  assert.equal(response.status, 409)
  assert.equal(response.payload.success, false)
  assert.match(String(response.payload.message), /cache key mismatch/)
  assert.equal(bakeCalled, false)
})

test('Blender style bake route reports backend unavailable', async () => {
  const publicDir = mkdtempSync(join(tmpdir(), 'style-bake-blender-'))
  const req = createJsonRequest('/api/style/bake-blender', {
    assetUrl: '/generated/style-lab/sources/fixture/source.glb',
  })
  const { done, res } = createJsonResponse()

  await handleStyleRoutes(
    req,
    res,
    { pathname: '/api/style/bake-blender', parsedUrl: { query: {} } },
    createStyleRouteContext(publicDir, {
      detectBlenderExecutable: () => '',
    }),
  )
  const response = await done

  assert.equal(response.status, 503)
  assert.equal(response.payload.success, false)
  assert.equal(response.payload.mode, 'blender-geometry')
  assert.match(String(response.payload.message), /Blender executable not found/)
})

test('batch style bake cache reuses only clean products', () => {
  const root = mkdtempSync(join(tmpdir(), 'style-bake-cache-'))
  const assetPath = join(root, 'fixture-style-baked.glb')
  const metadataPath = join(root, 'fixture-style-baked.json')
  writeFixtureFile(assetPath, 'style baked glb')
  const settings = {
    styleProfileName: 'Fixture Style',
    prompt: 'fixture prompt',
    textureSize: 256,
  }
  const sourceAssetFingerprint = {
    algorithm: 'sha256',
    value: '1'.repeat(64),
  }
  const settingsFingerprint = getStyleBakeSettingsFingerprint(settings)
  const cacheKey = getStyleBakeCacheKey({
    sourceAssetFingerprint,
    settingsFingerprint,
    generator: styleBakeProceduralGenerator,
  })
  const product = createStyleBakeProduct({
    assetUrl: '/generated/style-lab/baked-style/cache/fixture-style-baked.glb',
    metadataUrl:
      '/generated/style-lab/baked-style/cache/fixture-style-baked.json',
    sourceAssetUrl: '/generated/style-lab/sources/fixture/source.glb',
    sourceAssetFingerprint,
    settings,
    settingsFingerprint,
    cacheKey,
    levelId: 'fixture-level',
    nodeId: 'fixture-style-actor',
    generator: styleBakeProceduralGenerator,
  })
  writeFixtureFile(metadataPath, JSON.stringify({ product }))

  assert.equal(
    findReusableStyleBakeProduct({
      product,
      assetPath,
      metadataPath,
      sourceAssetFingerprint,
      settingsFingerprint,
      cacheKey,
      generator: styleBakeProceduralGenerator,
    }),
    product,
  )
  assert.equal(
    findReusableStyleBakeProduct({
      product,
      assetPath,
      metadataPath,
      sourceAssetFingerprint: {
        algorithm: 'sha256',
        value: '2'.repeat(64),
      },
      settingsFingerprint,
      cacheKey,
      generator: styleBakeProceduralGenerator,
    }),
    null,
  )
})

test('source guard flags direct procedural style bake endpoint bypasses', () => {
  const appRoot = mkdtempSync(join(tmpdir(), 'style-bake-source-guard-'))
  writeFixtureFile(
    join(appRoot, 'src/threlte/editor/AdHocStyleBake.ts'),
    "fetch('/api/style/bake-procedural')",
  )
  writeFixtureFile(
    join(appRoot, 'src/threlte/editor/editorStyleApi.ts'),
    "fetch('/api/style/bake-procedural')",
  )

  const failures = auditSourceGuards({ appRoot })

  assert.match(
    failures.join('\n'),
    /direct \/api\/style\/bake-procedural calls must go through editorStyleBakeManager/,
  )
  assert.doesNotMatch(
    failures.join('\n'),
    /editorStyleApi\.ts: direct \/api\/style\/bake-procedural/,
  )
})

test('source guard keeps NPC interaction target independent from firefly motion helpers', () => {
  const appRoot = mkdtempSync(join(tmpdir(), 'npc-target-source-guard-'))
  writeFixtureFile(
    join(
      appRoot,
      'src/threlte/features/npc/RuntimeNpcInteractionTarget.svelte',
    ),
    "import { resolveFireflyNpcPresentation } from './presentation/fireflyNpcPresentation'",
  )

  const failures = auditSourceGuards({ appRoot })

  assert.match(
    failures.join('\n'),
    /generic NPC interaction targets must consume owner-provided transforms/,
  )
})

test('source guard keeps ambient firefly motion dependent on elapsed frame time', () => {
  const appRoot = mkdtempSync(join(tmpdir(), 'firefly-field-source-guard-'))
  writeFixtureFile(
    join(appRoot, 'src/threlte/levels/SceneFireflyField.svelte'),
    [
      '{#each fireflies as firefly, index (firefly.id)}',
      '  {@const fireflyPosition = getPosition(firefly)}',
      '  {@const pulse = getPulse(firefly)}',
      '{/each}',
    ].join('\n'),
  )

  const failures = auditSourceGuards({ appRoot })

  assert.match(
    failures.join('\n'),
    /ambient firefly field motion and light pulse must pass elapsed explicitly/,
  )
})

test('source guard requires explicit scene hemisphere lighting', () => {
  const appRoot = mkdtempSync(join(tmpdir(), 'scene-lighting-source-guard-'))
  writeFixtureFile(
    join(appRoot, 'src/threlte/editor/scenes/fixture.scene.json'),
    JSON.stringify({
      levelId: 'fixture',
      settings: {
        level: {
          lighting: {
            ambientIntensity: 0.2,
            keyLightIntensity: 0.4,
            fillLightIntensity: 0.1,
          },
        },
      },
      nodes: [],
    }),
  )

  const failures = auditSourceGuards({ appRoot })

  assert.match(
    failures.join('\n'),
    /settings\.level\.lighting\.hemisphereIntensity must be explicit/,
  )
})

test('source guard keeps dedicated NPC editor workspace wired', () => {
  const appRoot = mkdtempSync(join(tmpdir(), 'npc-editor-source-guard-'))
  writeFixtureFile(
    join(appRoot, 'src/threlte/editor/editorPanelTabs.ts'),
    "export type EditorPanelTab = 'scene' | 'world'",
  )
  writeFixtureFile(
    join(appRoot, 'src/threlte/editor/EditorPanel.svelte'),
    "{#if activeEditorTab === 'world'}{/if}",
  )
  writeFixtureFile(
    join(appRoot, 'src/threlte/editor/EditorEnvironmentPanel.svelte'),
    "updateLevelSetting(['fireflies', 'count'], 12)",
  )

  const failures = auditSourceGuards({ appRoot })

  assert.match(
    failures.join('\n'),
    /dedicated NPC editor tab must stay in the editor tab contract/,
  )
  assert.match(
    failures.join('\n'),
    /dedicated NPC editor workspace must render EditorNpcTabHost/,
  )
  assert.match(
    failures.join('\n'),
    /firefly field controls belong in the NPC editor workspace/,
  )
})

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
              source: 'source-glb',
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
            collisionSource: 'source-linked-terrain-collision',
          },
        },
      },
    }),
  })

  assert.ok(plan.steps.includes('bake-terrain-collision'))
  assert.ok(plan.steps.includes('cook-terrain-glb-chunks'))
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

  const command = pipeline.commands.find(item => item.id === 'cook-glb-chunks')

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
  const cookCommand = pipeline.commands.find(
    item => item.id === 'cook-glb-chunks',
  )

  assert.equal(bakeCommand?.enabled, false)
  assert.equal(cookCommand?.enabled, false)
  assert.match(pipeline.sourceExistenceStatus.detail, /Source asset missing/)
  assert.match(pipeline.blockers.join('\n'), /Source asset missing/)
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
            source: 'source-glb',
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

test('publish readiness reports clean style-baked runtime products', () => {
  const fixture = createStyleBakeReadinessFixture()
  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: 'fixture-level',
    scene: fixture.scene,
    runtimeAssetManifest: fixture.runtimeAssetManifest as any,
    runtimeScene: fixture.runtimeScene,
    prefabManifest: { prefabs: [], summary: { prefabCount: 0 } },
    terrainManifest: null,
    styleBakeMetadata: fixture.styleBakeMetadata as any,
  })
  const section = viewModel.sections.find(
    item => item.id === 'style-bake-products',
  )

  assert.equal(section?.severity, 'ready')
  assert.match(section?.detail ?? '', /1 style-baked object/)
})

test('publish readiness blocks required style bake when source fingerprint is stale', () => {
  const fixture = createStyleBakeReadinessFixture({
    runtimeStyleBake: {
      status: 'stale-source',
      sourceAssetFingerprintMatches: false,
    },
    metadata: {
      sourceAssetFingerprint: {
        algorithm: 'sha256',
        value: 'e'.repeat(64),
      },
    },
  })
  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: 'fixture-level',
    scene: fixture.scene,
    runtimeAssetManifest: fixture.runtimeAssetManifest as any,
    runtimeScene: fixture.runtimeScene,
    prefabManifest: { prefabs: [], summary: { prefabCount: 0 } },
    terrainManifest: null,
    styleBakeMetadata: fixture.styleBakeMetadata as any,
  })
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene: fixture.scene,
    metadata: createEditorPublishBakePlanMetadataFromReadiness(viewModel),
  })

  assert.match(
    viewModel.blockers.map(item => item.detail).join('\n'),
    /source mesh fingerprint differs/,
  )
  assert.match(plan.blockers.join('\n'), /style-baked assets/)
})

test('publish readiness blocks required style bake when settings fingerprint is stale', () => {
  const fixture = createStyleBakeReadinessFixture({
    runtimeStyleBake: {
      status: 'stale-settings',
      styleSettingsFingerprintMatches: false,
    },
    metadata: {
      styleSettingsFingerprint: {
        algorithm: 'sha256',
        value: 'f'.repeat(64),
      },
    },
  })
  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: 'fixture-level',
    scene: fixture.scene,
    runtimeAssetManifest: fixture.runtimeAssetManifest as any,
    runtimeScene: fixture.runtimeScene,
    prefabManifest: { prefabs: [], summary: { prefabCount: 0 } },
    terrainManifest: null,
    styleBakeMetadata: fixture.styleBakeMetadata as any,
  })

  assert.match(
    viewModel.blockers.map(item => item.detail).join('\n'),
    /style settings fingerprint differs/,
  )
})

test('publish readiness blocks required style bake when generated GLB is missing', () => {
  const fixture = createStyleBakeReadinessFixture({
    assetEntry: {
      sourceExists: false,
      styleBake: {
        status: 'missing-generated-asset',
        runtimeCookRequired: true,
        runtimeCooked: false,
      },
    },
  })
  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: 'fixture-level',
    scene: fixture.scene,
    runtimeAssetManifest: fixture.runtimeAssetManifest as any,
    runtimeScene: fixture.runtimeScene,
    prefabManifest: { prefabs: [], summary: { prefabCount: 0 } },
    terrainManifest: null,
    styleBakeMetadata: fixture.styleBakeMetadata as any,
  })

  assert.match(
    viewModel.blockers.map(item => item.detail).join('\n'),
    /generated style asset is missing/,
  )
})

test('publish readiness blocks required style bake when generated metadata is missing', () => {
  const fixture = createStyleBakeReadinessFixture({
    runtimeStyleBake: {
      status: 'missing-generated-metadata',
    },
  })
  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: 'fixture-level',
    scene: fixture.scene,
    runtimeAssetManifest: fixture.runtimeAssetManifest as any,
    runtimeScene: fixture.runtimeScene,
    prefabManifest: { prefabs: [], summary: { prefabCount: 0 } },
    terrainManifest: null,
    styleBakeMetadata: {
      [fixture.metadataUrl]: {
        value: null,
        error: 'fixture metadata missing',
      },
    } as any,
  })

  assert.match(
    viewModel.blockers.map(item => item.detail).join('\n'),
    /generated style metadata is unavailable/,
  )
})

test('publish readiness warns when style-baked texture dimensions exceed tier budget', () => {
  const oversizedMetadata = createFixtureRuntimeAssetMetadata({
    textures: [
      {
        index: 0,
        imageIndex: 0,
        mimeType: 'image/png',
        width: 2048,
        height: 2048,
        byteLength: 4096,
        roles: ['baseColor'],
        colorSpace: 'srgb',
        compression: 'none',
      },
    ],
  })
  const fixture = createStyleBakeReadinessFixture({
    runtimeStyleBake: {
      status: 'over-budget',
      budget: {
        selectedTier: 'medium',
        maxTextureSize: 1024,
        textureCount: 1,
        oversizedTextures: 1,
        unusedTextureCount: 0,
        overBudget: true,
      },
    },
    assetEntry: {
      qualityVariants: {
        high: {
          exists: true,
          url: 'fixture.high.glb',
          metadata: oversizedMetadata,
          pipeline: { textureSize: 2048 },
          lodValidation: { meetsTarget: true },
        },
        medium: {
          exists: true,
          url: 'fixture.medium.glb',
          metadata: oversizedMetadata,
          pipeline: { textureSize: 1024 },
          lodValidation: { meetsTarget: true },
        },
        low: {
          exists: true,
          url: 'fixture.low.glb',
          metadata: oversizedMetadata,
          pipeline: { textureSize: 512 },
          lodValidation: { meetsTarget: true },
        },
      },
    },
  })
  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: 'fixture-level',
    scene: fixture.scene,
    runtimeAssetManifest: fixture.runtimeAssetManifest as any,
    runtimeScene: fixture.runtimeScene,
    prefabManifest: { prefabs: [], summary: { prefabCount: 0 } },
    terrainManifest: null,
    styleBakeMetadata: fixture.styleBakeMetadata as any,
  })
  const section = viewModel.sections.find(
    item => item.id === 'style-bake-products',
  )

  assert.equal(section?.severity, 'warning')
  assert.match(
    viewModel.warnings.map(item => item.detail).join('\n'),
    /texture budget is exceeded/,
  )
})

test('AI texture source products remain optional for publish readiness', () => {
  const scene = createScene({
    nodes: [
      {
        id: 'fixture-ai-texture',
        name: 'Fixture AI Texture',
        kind: 'asset',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        asset: {
          url: '/generated/hunyuan3d/fixture-ai/fixture-ai.glb',
        },
        generation: {
          styleBakeProduct: {
            schemaVersion: 1,
            mode: 'ai-texture-source',
            sourceAssetUrl: '/generated/style-lab/sources/fixture/source.glb',
            generatedAssetUrl: '',
            generatedMetadataUrl: '',
            sourceAssetFingerprint: fixtureStyleSourceFingerprint,
            settingsFingerprint: fixtureStyleSettingsFingerprint,
            state: { status: 'missing' },
          } as any,
        },
      },
    ],
  })
  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: 'fixture-level',
    scene,
    runtimeAssetManifest: null,
    runtimeScene: null,
    prefabManifest: { prefabs: [], summary: { prefabCount: 0 } },
    terrainManifest: null,
    styleBakeMetadata: {},
  })
  const section = viewModel.sections.find(
    item => item.id === 'style-bake-products',
  )

  assert.equal(
    viewModel.blockers.some(item => item.label === 'Style-Baked Asset'),
    false,
  )
  assert.equal(section?.severity, 'ready')
  assert.match(section?.detail ?? '', /No style-baked products are required/)
})

test('runtime cook style bake classifier ignores AI texture source metadata', () => {
  assert.equal(
    isStyleBakeMetadata({
      sourceAssetUrl: '/generated/style-lab/sources/fixture/source.glb',
      backend: 'comfyui',
      mode: 'texture',
      prompt: 'AI texture source prompt',
      paintModel: 'hunyuan3d-paint-v2-0-turbo',
    }),
    false,
  )
  assert.equal(
    isStyleBakeMetadata({
      sourceAssetUrl: '/generated/style-lab/sources/fixture/source.glb',
      mode: 'procedural-material',
      generator: 'Merkin deterministic procedural style bake',
      product: {
        mode: 'procedural-material',
      },
    }),
    true,
  )
  assert.equal(
    isStyleBakeMetadata({
      styleBakeProduct: {
        sourceAssetUrl: '/generated/style-lab/sources/fixture/source.glb',
        mode: 'procedural-material',
        generator: 'Merkin deterministic procedural style bake',
        settings: {
          styleProfileName: 'Fixture Style',
          textureSize: 256,
        },
      },
    }),
    true,
  )
})

test('runtime asset audit fails missing generated style-baked GLBs', () => {
  const fixture = createStyleBakeReadinessFixture({
    assetEntry: {
      styleBake: {
        status: 'missing-generated-asset',
        runtimeCookRequired: true,
        runtimeCooked: false,
      },
    },
  })

  const audit = auditRuntimeAssetManifestObject({
    manifest: fixture.runtimeAssetManifest,
    runtimeSceneManifests: [],
  })

  assert.equal(audit.report.styleBakeAssetCount, 1)
  assert.equal(audit.report.styleBakeMissingGeneratedAsset, 1)
  assert.match(
    audit.failures.join('\n'),
    /generated style-baked GLB is missing/,
  )
})

test('scene architecture audit flags unmanaged style-baked GLBs', () => {
  const root = mkdtempSync(join(tmpdir(), 'style-bake-scene-audit-'))
  const sceneDir = join(root, 'scenes')
  const publicDir = join(root, 'public')
  const prefabCatalogPath = join(root, 'runtimePrefabCatalog.json')
  const assetUrl =
    '/generated/style-lab/baked-style/fixture/fixture-style-baked.glb'
  writeFixtureFile(join(publicDir, assetUrl.replace(/^\//, '')), 'style glb')
  writeFixtureFile(
    prefabCatalogPath,
    JSON.stringify({ types: [], assetUrls: {}, assetVariants: {} }),
  )
  writeFixtureFile(
    join(sceneDir, 'fixture.scene.json'),
    JSON.stringify({
      levelId: 'fixture',
      version: 1,
      nodes: [
        {
          id: 'unmanaged-style',
          name: 'Unmanaged Style',
          kind: 'asset',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          asset: { url: assetUrl },
          collision: {
            mode: 'none',
            intent: 'none',
            channel: 'worldStatic',
          },
        },
      ],
      settings: {
        level: {
          spawn: {
            position: [0, 1, 0],
            rotation: [0, 0, 0],
          },
          ground: {
            mode: 'scene-authored',
            visualSource: 'scene-actors',
            terrainRuntimeMode: 'scene-authored',
            terrainVisualSource: 'scene-actors',
            collisionSource: 'scene-colliders',
            fallbackSurfacePolicy: 'disabled',
          },
          graphicsBudget: {
            maxRuntimeAssetBytes: 1048576,
            maxRuntimeAssetFileBytes: 1048576,
            maxGeometryActors: 4,
            maxPrimitiveActors: 4,
            maxNeverCullActors: 4,
            maxGameplayFireflies: 4,
            maxExplicitColliders: 4,
            maxLightActors: 4,
            maxEstimatedDrawCalls: 8,
            maxAuthoredMaterialSlots: 8,
            maxEstimatedTriangles: 1000,
            maxAuthoredTextureBytes: 1048576,
          },
          renderProfile: {
            id: 'fixture-render',
            defaultTier: 'mobile',
            shadows: {
              enabled: false,
              maxCastingLights: 0,
            },
            reflections: {
              mode: 'none',
              source: 'none',
            },
            postProcessing: {
              passes: [],
              maxEnabledPasses: 0,
            },
            visualBookmarks: [
              {
                id: 'main',
                cameraPosition: [0, 2, 4],
                cameraTarget: [0, 0, 0],
              },
            ],
            qualityTiers: {
              mobile: {},
              desktop: {},
              tv: {},
            },
          },
        },
      },
    }),
  )

  const audit = auditSceneArchitecture({
    sceneDir,
    publicDir,
    prefabCatalogPath,
  })

  assert.match(
    audit.failures.join('\n'),
    /style-baked GLBs must be managed by generation\.styleBakeProduct metadata/,
  )
  assert.equal(audit.totals.unmanagedStyleBakeProducts, 1)
})

test('scene architecture audit flags invalid NPC contracts', () => {
  const root = mkdtempSync(join(tmpdir(), 'npc-scene-audit-'))
  const sceneDir = join(root, 'scenes')
  const publicDir = join(root, 'public')
  const prefabCatalogPath = join(root, 'runtimePrefabCatalog.json')
  writeFixtureFile(
    prefabCatalogPath,
    JSON.stringify({ types: [], assetUrls: {}, assetVariants: {} }),
  )
  writeFixtureFile(
    join(sceneDir, 'fixture.scene.json'),
    JSON.stringify(
      createScene({
        nodes: [
          {
            id: 'audit-firefly',
            name: 'Audit Firefly',
            kind: 'group',
            position: [0, 1.2, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            visible: true,
            npc: createFireflyNpc({
              conversation: {
                mode: 'read-only',
                body: '',
              },
            }),
          },
        ],
        settings: {
          level: {
            spawn: {
              position: [0, 1, 0],
              rotation: [0, 0, 0],
            },
            graphicsBudget: {
              maxRuntimeAssetBytes: 1048576,
              maxRuntimeAssetFileBytes: 1048576,
              maxGeometryActors: 4,
              maxPrimitiveActors: 4,
              maxNeverCullActors: 4,
              maxGameplayFireflies: 4,
              maxExplicitColliders: 4,
              maxLightActors: 4,
              maxEstimatedDrawCalls: 8,
              maxAuthoredMaterialSlots: 8,
              maxEstimatedTriangles: 1000,
              maxAuthoredTextureBytes: 1048576,
            },
            renderProfile: {
              id: 'fixture-render',
              defaultTier: 'mobile',
              shadows: {
                enabled: false,
                maxCastingLights: 0,
              },
              reflections: {
                mode: 'none',
                source: 'none',
              },
              postProcessing: {
                passes: [],
                maxEnabledPasses: 0,
              },
              visualBookmarks: [
                {
                  id: 'main',
                  cameraPosition: [0, 2, 4],
                  cameraTarget: [0, 0, 0],
                },
              ],
              qualityTiers: {
                mobile: {},
                desktop: {},
                tv: {},
              },
            },
          },
        },
      }),
    ),
  )

  const audit = auditSceneArchitecture({
    sceneDir,
    publicDir,
    prefabCatalogPath,
  })

  assert.match(
    audit.failures.join('\n'),
    /NPC contract is invalid: NPC actor "audit-firefly" field "npc\.conversation\.body"/,
  )
  assert.equal(audit.totals.npcValidationErrors, 1)
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

test('GLB terrain collision contract rejects non-source-linked collision modes', () => {
  const diagnostics = validateTerrainManifestCollisionContract({
    manifest: createGlbTerrainManifest({
      collisionBakeMode: 'unknown-collision-mode',
    }),
    levelId: 'fixture-level',
    spawnPoint: [5, 1, 5],
  })

  assert.match(
    diagnostics.errors.join('\n'),
    /collision bake mode must be source-linked/,
  )
})

test('GLB terrain collision contract requires render source hash provenance', () => {
  const diagnostics = validateTerrainManifestCollisionContract({
    manifest: createGlbTerrainManifest({
      sourceAssetUrl: '/models/levels/other-level.glb',
      sourceAssetUrls: [
        '/models/levels/other-level.glb',
        '/models/levels/fixture-level.glb',
      ],
      authoredSourceAssetUrls: ['/models/levels/fixture-level.glb'],
      sourceAssetFingerprint: {
        algorithm: 'sha256',
        value: 'b'.repeat(64),
      },
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
        hasCollider: false,
        hasSource: false,
      },
    }),
    ['validation'],
  )
  assert.deepEqual(
    planEditorTerrainBakeSteps({
      pipeline: {
        mode: 'glb-chunk-terrain',
        hasCollider: false,
        hasSource: true,
      },
      terrain: {
        dirty: true,
        lastChunksGeneratedAt: '2026-05-11T00:00:00.000Z',
      },
      groundMode: 'terrain-chunks',
    }),
    ['source-glb-chunks', 'collision', 'validation'],
  )
})

test('editor terrain pipeline runner builds stable backend requests', () => {
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

test('editor terrain pipeline runner applies source GLB chunk products', () => {
  const next = applyTerrainChunkCookPayload(
    {
      collision: {
        terrain: {
          sourceAssetUrl: '/models/levels/fixture.glb',
        },
      },
      ground: {
        visualSource: 'terrain-chunks',
      },
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
  assert.equal(next.ground?.visualSource, 'source-glb-chunks')
  assert.equal(next.ground?.terrainVisualSource, 'source-glb-chunks')
  assert.equal(next.collision?.terrain?.runtimeMode, 'glb-chunk-terrain')
  assert.equal(next.collision?.terrain?.visualSource, 'source-glb-chunks')
  assert.equal(next.collision?.terrain?.renderChunks?.type, 'glb-chunk-terrain')
  assert.equal(next.collision?.terrain?.renderChunks?.preservesSourceUvs, true)
  assert.equal(
    next.collision?.terrain?.renderChunks?.preservesSourceMaterialSlots,
    true,
  )
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
              source: 'source-glb',
              runtimeMode: 'glb-chunk-terrain',
              visualSource: 'source-glb-chunks',
              manifestUrl: '/terrain/fixture-level.manifest.json',
              colliderUrl: '/terrain/colliders/fixture-level.mmtc',
              metadataUrl: '/terrain/colliders/fixture-level.metadata.json',
              sourceAssetUrl: '/models/levels/fixture-level.glb',
              chunksPath: '/terrain/levels/fixture-level/',
              chunkCount: 48,
            },
          },
          ground: {
            mode: 'terrain-chunks',
            terrainRuntimeMode: 'glb-chunk-terrain',
            terrainVisualSource: 'source-glb-chunks',
            collisionSource: 'source-linked-terrain-collision',
          },
        },
      },
    }),
    metadata: createEditorPublishBakePlanMetadataFromReadiness({
      commands: [
        {
          id: 'bake-scene-mesh-colliders',
          command:
            'pnpm --dir apps/game bake:scene-mesh-colliders -- --level=fixture-level',
          reason: 'Regenerate dirty mesh colliders.',
        },
        {
          id: 'cook-terrain-glb-chunks',
          command: 'pnpm --dir apps/game cook:terrain-glb-chunks',
          reason: 'Cook stale terrain visual chunks.',
        },
        {
          id: 'cook-runtime-assets',
          command:
            'pnpm --dir apps/game cook:runtime-assets -- --level=fixture-level',
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

  assert.ok(plan.steps.includes('cook-terrain-glb-chunks'))
  assert.ok(plan.steps.includes('bake-scene-mesh-colliders'))
  assert.ok(plan.steps.includes('cook-runtime-assets'))
  assert.ok(plan.steps.includes('audit-engine'))
  assert.ok(
    plan.steps.indexOf('bake-scene-mesh-colliders') <
      plan.steps.indexOf('cook-runtime-assets'),
  )
})

test('dirty generated mesh colliders become publish bake work', () => {
  const scene = createSceneAuthoredCollisionScene({
    collision: {
      mode: 'auto',
      quality: 'simplifiedMesh',
      shape: 'trimesh',
      intent: 'blocker',
      channel: 'worldStatic',
      generationStatus: 'dirty',
      colliderUrl:
        '/generated/runtime-game-assets/collision/fixture-level/fixture-decor.collider.glb',
      colliderMetadataUrl:
        '/generated/runtime-game-assets/collision/fixture-level/fixture-decor.collider.meta.json',
      maxTriangles: 5000,
    },
  })
  const viewModel = buildEditorPublishReadinessViewModel({
    levelId: 'fixture-level',
    scene,
    runtimeAssetManifest: null,
    runtimeScene: null,
    prefabManifest: null,
    terrainManifest: null,
  })
  const plan = computeEditorPublishBakePlan({
    levelId: 'fixture-level',
    scene,
    metadata: createEditorPublishBakePlanMetadataFromReadiness(viewModel),
  })

  assert.ok(
    viewModel.commands.some(
      command => command.id === 'bake-scene-mesh-colliders',
    ),
  )
  assert.ok(plan.steps.includes('bake-scene-mesh-colliders'))
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
  assert.deepEqual(calls[0].args.slice(2), [
    'cook:runtime-assets',
    '--',
    '--level=fixture-level',
  ])
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
        'bake-scene-mesh-colliders',
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
    calls.map(call => call.args[2]),
    [
      'bake:terrain-collision',
      'bake:scene-mesh-colliders',
      'cook:terrain-glb-chunks',
      'cook:world-partition',
      'cook:runtime-assets',
      'audit:engine',
    ],
  )
  assert.deepEqual(
    calls.find(call => call.args[2] === 'cook:runtime-assets')?.args.slice(2),
    ['cook:runtime-assets', '--', '--level=fixture-level'],
  )
  assert.deepEqual(
    (response.payload.steps as Array<{ id: string }>).map(step => step.id),
    [
      'bake-terrain-collision',
      'bake-scene-mesh-colliders',
      'cook-terrain-glb-chunks',
      'cook-world-partition',
      'cook-runtime-assets',
      'audit-engine',
    ],
  )
})

test('publish-build endpoint scopes audit failures to the requested level', async () => {
  const { calls, spawnImpl } = createSpawnStub({
    'audit:engine': {
      stderr: [
        'Engine architecture audit failed',
        '================================',
        '- yggdrasil.scene.json: asset trimesh collider artifacts are missing or invalid',
        '- yggdrasil: runtime asset "/generated/style-lab/sources/root.glb" has no usable medium or source metadata',
        '',
      ].join('\n'),
    },
  })
  const route = {
    pathname: '/api/editor-scene/publish-build',
    parsedUrl: { query: {} },
  }
  const req = createJsonRequest(route.pathname, {
    levelId: 'observatory',
    plan: {
      steps: ['cook-runtime-assets', 'audit-engine'],
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
    ['cook:runtime-assets', 'audit:engine'],
  )
  const auditStep = response.payload.steps.find(
    (step: { id: string }) => step.id === 'audit-engine',
  )
  assert.equal(auditStep.success, true)
  assert.equal(auditStep.exitCode, 1)
  assert.match(auditStep.message, /passed for observatory/)
})

test('publish-build endpoint fails audit failures for the requested level', async () => {
  const { spawnImpl } = createSpawnStub({
    'audit:engine': {
      stderr: [
        'Engine architecture audit failed',
        '================================',
        '- observatory.scene.json: settings.level.lighting.sunIntensity is retired',
        '',
      ].join('\n'),
    },
  })
  const route = {
    pathname: '/api/editor-scene/publish-build',
    parsedUrl: { query: {} },
  }
  const req = createJsonRequest(route.pathname, {
    levelId: 'observatory',
    plan: {
      steps: ['cook-runtime-assets', 'audit-engine'],
    },
  })
  const { done, res } = createJsonResponse()
  const handled = handleSceneRoutes(req, res, route, {
    REPO_ROOT: process.cwd(),
    spawnImpl,
  })
  const response = await done

  assert.equal(handled, true)
  assert.equal(response.status, 500)
  assert.equal(response.payload.success, false)
  assert.equal(response.payload.failedStep, 'audit-engine')
  assert.match(response.payload.message, /observatory\.scene\.json/)
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

test('runtime asset cook endpoint scopes the cook command to the requested level', async () => {
  const { calls, spawnImpl } = createSpawnStub()
  const route = {
    pathname: '/api/editor-scene/cook-runtime-assets',
    parsedUrl: { query: {} },
  }
  const req = createJsonRequest(route.pathname, {
    levelId: 'fixture-level',
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
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].args.slice(2), [
    'cook:runtime-assets',
    '--',
    '--level=fixture-level',
  ])
})
