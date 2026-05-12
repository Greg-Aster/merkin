import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { retopologizeGlbLodByTriangleArea } from './gltfLodRetopology.mjs'
import {
  getAssetCookTierConfig,
  getCookedPublicUrl,
  resolvePublicPath,
} from './runtimeAssetCookManifest.mjs'

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

  const args = [
    'exec',
    'gltf-transform',
    'optimize',
    inputPath,
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
}
