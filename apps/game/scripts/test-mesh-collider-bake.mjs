import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const sourceAssetPath = resolve(
  repoRoot,
  'apps/megameal/public/generated/runtime-game-assets/prefabs/observation-rig/observation-rig.low.glb',
)
const tempRoot = mkdtempSync(join(tmpdir(), 'mesh-collider-bake-'))

try {
  const publicRoot = join(tempRoot, 'public')
  const assetDir = join(
    publicRoot,
    'generated/runtime-game-assets/prefabs/observation-rig',
  )
  mkdirSync(assetDir, { recursive: true })
  copyFileSync(sourceAssetPath, join(assetDir, 'observation-rig.low.glb'))

  const scenePath = join(tempRoot, 'fixture.scene.json')
  writeFileSync(
    scenePath,
    `${JSON.stringify(
      {
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
              url: '/generated/runtime-game-assets/prefabs/observation-rig/observation-rig.low.glb',
            },
            collision: {
              mode: 'auto',
              quality: 'simplifiedMesh',
              intent: 'blocker',
              channel: 'worldStatic',
              maxTriangles: 5000,
              friction: 0.65,
              restitution: 0.05,
              sensor: false,
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
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  const result = spawnSync(
    process.execPath,
    [
      resolve(repoRoot, 'apps/game/scripts/bake-mesh-collider.mjs'),
      '--level=fixture-level',
      '--node=fixture-asset',
      `--scene-path=${scenePath}`,
      `--public-root=${publicRoot}`,
      '--intent=blocker',
      '--channel=worldStatic',
      '--triangle-budget=5000',
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    },
  )

  assert.equal(
    result.error?.message,
    undefined,
    result.error?.message || result.stderr || result.stdout,
  )
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || 'bake command failed',
  )

  const jsonLine = result.stdout
    .trim()
    .split(/\r?\n/)
    .reverse()
    .find(line => line.trim().startsWith('{'))
    ?.trim()
  assert.ok(jsonLine, `Bake command did not emit JSON.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
  const payload = JSON.parse(jsonLine)
  assert.equal(payload.success, true)
  assert.equal(payload.colliderUrl, '/generated/runtime-game-assets/collision/fixture-level/fixture-asset.collider.glb')
  assert.equal(payload.metadataUrl, '/generated/runtime-game-assets/collision/fixture-level/fixture-asset.collider.meta.json')
  assert.equal(typeof payload.colliderCacheKey, 'string')
  assert.ok(payload.colliderCacheKey.length > 64)
  assert.ok(payload.triangleCount > 0)
  assert.ok(payload.triangleCount <= 5000)
  assert.equal('originalCollision' in payload, false)

  const colliderPath = join(
    publicRoot,
    'generated/runtime-game-assets/collision/fixture-level/fixture-asset.collider.glb',
  )
  const metadataPath = join(
    publicRoot,
    'generated/runtime-game-assets/collision/fixture-level/fixture-asset.collider.meta.json',
  )
  assert.equal(existsSync(colliderPath), true)
  assert.equal(existsSync(metadataPath), true)

  const scene = JSON.parse(readFileSync(scenePath, 'utf8'))
  const node = scene.nodes[0]
  assert.equal(node.collision.shape, 'trimesh')
  assert.equal(node.collision.intent, 'blocker')
  assert.equal(node.collision.channel, 'worldStatic')
  assert.equal(node.collision.colliderUrl, payload.colliderUrl)
  assert.equal(node.collision.colliderMetadataUrl, payload.metadataUrl)
  assert.equal(node.collision.colliderCacheKey, payload.colliderCacheKey)
  assert.equal(node.collision.mode, 'auto')
  assert.equal(node.collision.lodTier, 'low')
  assert.equal(node.collision.colliderSourceAssetUrl, node.asset.url)
  assert.equal(node.collision.maxTriangles, 5000)
  assert.equal(node.collision.enabled, undefined)
  assert.equal(node.collision.triangleBudget, undefined)
  assert.equal(node.generation?.originalCollision, undefined)

  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
  assert.equal(metadata.schemaVersion, 3)
  assert.equal(metadata.sourceActorId, 'fixture-asset')
  assert.equal(metadata.sourceAssetUrl, node.asset.url)
  assert.equal(metadata.colliderSourceAssetUrl, node.asset.url)
  assert.equal(metadata.sourceAssetFingerprint.algorithm, 'sha256')
  assert.equal(metadata.sourceAssetFingerprint.value.length, 64)
  assert.equal(metadata.colliderSourceAssetFingerprint.algorithm, 'sha256')
  assert.equal(metadata.colliderSourceAssetFingerprint.value.length, 64)
  assert.equal(metadata.colliderUrl, payload.colliderUrl)
  assert.equal(metadata.metadataUrl, payload.metadataUrl)
  assert.equal(metadata.colliderCacheKey, payload.colliderCacheKey)
  assert.equal(
    payload.colliderCacheKey,
    [
      metadata.collisionProduct.generatorVersion,
      metadata.collisionProduct.sourceMeshFingerprint.value,
      metadata.collisionProduct.transformFingerprint.value,
      metadata.collisionProduct.policyFingerprint.value,
    ].join(':'),
  )
  assert.ok(metadata.bounds?.min)
  assert.ok(metadata.visualLocalBounds?.min)
  assert.ok(metadata.colliderLocalBounds?.min)
  assert.equal(metadata.assetLocalTransform.schemaVersion, 1)
  assert.equal(metadata.assetLocalTransform.coordinateSpaceVersion, 1)
  assert.equal(metadata.assetLocalTransform.sourceAssetUrl, node.asset.url)
  assert.equal(metadata.assetLocalTransform.sourceNodeName, 'Fixture Asset')
  assert.ok(metadata.assetLocalTransform.visualLocalBounds?.min)
  assert.ok(metadata.assetLocalTransform.colliderLocalBounds?.min)
  assert.deepEqual(metadata.assetLocalTransform.visualToPhysicsLocalMatrix, [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ])
  assert.deepEqual(
    node.collision.assetLocalTransform.visualToPhysicsLocalMatrix,
    metadata.assetLocalTransform.visualToPhysicsLocalMatrix,
  )
  assert.equal(metadata.provenance.sourceActorId, 'fixture-asset')
  assert.equal(metadata.provenance.sourceAssetUrl, node.asset.url)
  assert.equal(metadata.provenance.colliderSourceAssetUrl, node.asset.url)
  assert.equal(metadata.provenance.sourceAssetFingerprint.value, metadata.sourceAssetFingerprint.value)
  assert.equal(metadata.provenance.colliderSourceAssetFingerprint.value, metadata.colliderSourceAssetFingerprint.value)
  assert.equal(metadata.provenance.bakeConfig.triangleBudget, 5000)
  assert.equal(metadata.provenance.bakeConfig.lodSourceTier, 'low')
  assert.ok(metadata.simplification)

  console.log('Mesh collider bake fixture passed')
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
