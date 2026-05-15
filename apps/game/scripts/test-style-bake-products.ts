import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  createStyleBakeCacheKey,
  createStyleBakeSettingsFingerprint,
  normalizeStyleBakeSettings,
  proceduralStyleBakeGeneratorVersion,
  type StyleBakeInputContract,
} from '../src/threlte/editor/editorStyleBakeTypes.ts'

const backendProducts = await import('./lib/styleBakeProducts.mjs')

const settings = normalizeStyleBakeSettings({
  profileId: 'painterly-storybook',
  styleProfileName: 'Painterly Storybook',
  prompt: 'weathered painted stone',
  textureSize: 256,
  lineStrength: 0.35,
  brushStrength: 0.25,
  aoStrength: 0.8,
  cavityStrength: 0.65,
  curvatureStrength: 0.45,
  geometrySimplification: 0,
  outputTier: 'runtime',
  bevelCleanup: false,
  weightedNormalCleanup: true,
  lineGeometry: false,
})
const sourceAssetFingerprint = {
  algorithm: 'sha256' as const,
  value: 'a'.repeat(64),
}
const settingsFingerprint = createStyleBakeSettingsFingerprint(settings)

function createInput(
  overrides: Partial<StyleBakeInputContract> = {},
): Omit<StyleBakeInputContract, 'cacheKey' | 'generatorName'> {
  return {
    sourceAssetUrl: '/generated/style-lab/sources/fixture.glb',
    sourceAssetFingerprint,
    levelId: 'fixture-level',
    nodeId: 'fixture-node',
    sourceNodeTransform: {
      position: [1, 2, 3],
      rotation: [0, 0.25, 0],
      scale: [1, 1, 1],
    },
    sourceLocalBounds: {
      size: [2, 3, 4],
      maxDimension: 4,
    },
    mode: 'procedural-material',
    settings,
    settingsFingerprint,
    generatorVersion: proceduralStyleBakeGeneratorVersion,
    ...overrides,
  }
}

test('style bake cache key matches across editor and backend helpers', () => {
  const input = createInput()
  assert.deepEqual(
    backendProducts.getStyleBakeSettingsFingerprint(settings),
    settingsFingerprint,
  )
  assert.equal(
    backendProducts.getStyleBakeCacheKey({
      ...input,
      generator: backendProducts.styleBakeProceduralGenerator,
    }),
    createStyleBakeCacheKey(input),
  )
})

test('style bake cache key is stable across scene placement metadata', () => {
  const baseInput = createInput()
  const baseKey = createStyleBakeCacheKey(baseInput)

  assert.equal(
    createStyleBakeCacheKey({
      ...baseInput,
      sourceAssetUrl: '/generated/style-lab/sources/other-copy.glb',
      levelId: 'other-level',
      nodeId: 'other-node',
      sourceNodeTransform: {
        position: [9, 8, 7],
        rotation: [0, 1, 0],
        scale: [2, 1, 1],
      },
      sourceLocalBounds: {
        size: [2, 3, 5],
        maxDimension: 5,
      },
    }),
    baseKey,
  )
})

test('style bake cache key changes with source, backend, generator, and settings', () => {
  const baseInput = createInput()
  const baseKey = createStyleBakeCacheKey(baseInput)
  const changedSettings = normalizeStyleBakeSettings({
    ...settings,
    prompt: 'weathered inked stone',
  })

  assert.notEqual(
    createStyleBakeCacheKey({
      ...baseInput,
      sourceAssetFingerprint: {
        algorithm: 'sha256',
        value: 'b'.repeat(64),
      },
    }),
    baseKey,
  )
  assert.notEqual(
    createStyleBakeCacheKey({
      ...baseInput,
      mode: 'blender-geometry',
      generatorVersion: 'blender-geometry-v1',
    }),
    baseKey,
  )
  assert.notEqual(
    createStyleBakeCacheKey({
      ...baseInput,
      settings: changedSettings,
      settingsFingerprint: createStyleBakeSettingsFingerprint(changedSettings),
    }),
    baseKey,
  )
})

test('style bake product status rejects stale cache metadata', () => {
  const directory = mkdtempSync(join(tmpdir(), 'style-bake-product-'))
  const assetPath = join(directory, 'fixture.glb')
  const metadataPath = join(directory, 'fixture.json')
  writeFileSync(assetPath, 'fixture asset')
  writeFileSync(metadataPath, '{}')

  try {
    const input = createInput()
    const cacheKey = createStyleBakeCacheKey(input)
    const product = backendProducts.createStyleBakeProduct({
      ...input,
      assetUrl: '/generated/style-lab/baked-style/fixture.glb',
      metadataUrl: '/generated/style-lab/baked-style/fixture.json',
      cacheKey,
      generator: backendProducts.styleBakeProceduralGenerator,
    })

    assert.equal(
      backendProducts.getStyleBakeProductStatus({
        product,
        assetPath,
        metadataPath,
        sourceAssetFingerprint,
        settingsFingerprint,
        cacheKey,
        generator: backendProducts.styleBakeProceduralGenerator,
      }),
      'clean',
    )
    assert.equal(
      backendProducts.getStyleBakeProductStatus({
        product,
        assetPath,
        metadataPath,
        sourceAssetFingerprint,
        settingsFingerprint,
        cacheKey: `${cacheKey}:stale`,
        generator: backendProducts.styleBakeProceduralGenerator,
      }),
      'dirty',
    )
    assert.equal(
      backendProducts.getStyleBakeProductStatus({
        product,
        assetPath,
        metadataPath,
        sourceAssetFingerprint,
        settingsFingerprint,
        cacheKey,
        generator: {
          id: 'procedural-material-v2',
          label: backendProducts.STYLE_BAKE_GENERATORS.proceduralMaterial,
        },
      }),
      'dirty',
    )
    assert.equal(
      backendProducts.getStyleBakeProductStatus({
        product: {
          ...product,
          generatorVersion: 'procedural-material-v0',
        },
        assetPath,
        metadataPath,
        sourceAssetFingerprint,
        settingsFingerprint,
        cacheKey,
        generator: backendProducts.styleBakeProceduralGenerator,
      }),
      'dirty',
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
