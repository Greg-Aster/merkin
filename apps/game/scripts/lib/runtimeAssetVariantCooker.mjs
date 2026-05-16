import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { repairGeneratedPbrGlb } from './gltfGeneratedPbrRepair.mjs'
import { retopologizeGlbLodByTriangleArea } from './gltfLodRetopology.mjs'
import {
  getAssetCookTierConfig,
  getCookedPublicUrl,
  resolvePublicPath,
} from './runtimeAssetCookManifest.mjs'

function normalizePublicUrl(url) {
  return url.startsWith('/') ? url : `/${url}`
}

function shouldRepairGeneratedPbrSource(sourceUrl) {
  const normalizedUrl = normalizePublicUrl(sourceUrl)
  return (
    normalizedUrl.toLowerCase().endsWith('.glb') &&
    (normalizedUrl.startsWith('/generated/hunyuan3d/') ||
      normalizedUrl.startsWith('/generated/style-lab/') ||
      normalizedUrl.startsWith('/generated/runtime-game-assets/prefabs/'))
  )
}

function logGeneratedPbrRepair(scope, sourceUrl, report) {
  if (!report.changed) return
  console.log(
    `[cook-runtime-assets] repaired ${scope} ${sourceUrl} normals+=${report.addedNormalPrimitiveCount} implicitMetallic=${report.repairedImplicitMetallicMaterialCount}`,
  )
}

export function cookRuntimeAssetVariant({
  context,
  sourceUrl,
  tier,
  force = false,
}) {
  const inputPath = resolvePublicPath(context, sourceUrl)
  const outputUrl = getCookedPublicUrl(sourceUrl, tier.id)
  const outputPath = resolvePublicPath(context, outputUrl)
  const cookTier = getAssetCookTierConfig(sourceUrl, tier)

  if (!existsSync(inputPath)) {
    throw new Error(`Missing source asset: ${sourceUrl}`)
  }

  if (!force && existsSync(outputPath)) {
    console.log(`[cook-runtime-assets] skipped existing ${outputUrl}`)
    return
  }

  mkdirSync(dirname(outputPath), { recursive: true })

  const shouldRepairGeneratedPbr = shouldRepairGeneratedPbrSource(sourceUrl)
  const tempDir = shouldRepairGeneratedPbr
    ? mkdtempSync(join(tmpdir(), 'merkin-gltf-pbr-'))
    : null
  const preparedInputPath = tempDir ? join(tempDir, 'input.glb') : inputPath

  if (shouldRepairGeneratedPbr) {
    logGeneratedPbrRepair(
      'source',
      sourceUrl,
      repairGeneratedPbrGlb({
        inputPath,
        outputPath: preparedInputPath,
      }),
    )
  }

  const args = [
    'exec',
    'gltf-transform',
    'optimize',
    preparedInputPath,
    outputPath,
    '--compress',
    'quantize',
    '--texture-compress',
    'webp',
    '--texture-size',
    String(cookTier.textureSize),
    '--simplify',
    'true',
    '--simplify-ratio',
    String(cookTier.simplifyRatio),
    '--simplify-error',
    String(cookTier.simplifyError),
    '--simplify-lock-border',
    String(cookTier.simplifyLockBorder ?? false),
  ]

  try {
    const result = spawnSync('pnpm', args, {
      cwd: context.repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    if (result.status !== 0) {
      throw new Error(
        `Failed to cook ${sourceUrl} ${tier.id} with exit code ${result.status}`,
      )
    }

    if (shouldRepairGeneratedPbr) {
      logGeneratedPbrRepair(
        'variant',
        outputUrl,
        repairGeneratedPbrGlb({ inputPath: outputPath }),
      )
    }

    if (cookTier.retopology?.strategy === 'largest-triangle-area-prune') {
      const report = retopologizeGlbLodByTriangleArea({
        path: outputPath,
        maxTriangles: cookTier.retopology.maxTriangles,
      })
      if (report.changed) {
        console.log(
          `[cook-runtime-assets] retopology ${outputUrl} triangles=${report.sourceTriangleCount}->${report.triangleCount} vertices=${report.vertexCount}`,
        )
      }
    }
  } finally {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true })
  }
}
