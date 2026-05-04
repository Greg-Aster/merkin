import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import {
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
    String(tier.textureSize),
    '--simplify',
    'true',
    '--simplify-ratio',
    String(tier.simplifyRatio),
    '--simplify-error',
    String(tier.simplifyError),
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
}
