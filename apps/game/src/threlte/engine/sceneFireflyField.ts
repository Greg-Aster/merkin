import type { SharedLevelFireflySettings } from './sceneDocumentTypes'

export type SceneFireflyFieldSettings = NonNullable<
  SharedLevelFireflySettings['fireflies']
>

export type SceneFireflyQualityTier =
  | 'ultra_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'ultra'

export interface ResolvedSceneFireflyFieldQuality {
  tier: SceneFireflyQualityTier
  count: number
  lightCount: number
  size: number
  spriteIntensity: number
}

const sceneFireflyQualityTiers = new Set<SceneFireflyQualityTier>([
  'ultra_low',
  'low',
  'medium',
  'high',
  'ultra',
])

export function normalizeSceneFireflyQualityTier(
  tier: string | null | undefined,
): SceneFireflyQualityTier {
  if (tier && sceneFireflyQualityTiers.has(tier as SceneFireflyQualityTier)) {
    return tier as SceneFireflyQualityTier
  }
  return 'medium'
}

function finiteNumberOrDefault(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function finiteCountOrDefault(value: unknown, fallback: number) {
  return Math.max(0, Math.floor(finiteNumberOrDefault(value, fallback)))
}

export function resolveSceneFireflyFieldQuality(input: {
  settings: SceneFireflyFieldSettings | null | undefined
  qualityTier: string | null | undefined
  defaultCount?: number
  defaultLightCount?: number
  defaultSize?: number
  defaultSpriteIntensity?: number
}): ResolvedSceneFireflyFieldQuality {
  const tier = normalizeSceneFireflyQualityTier(input.qualityTier)
  const settings = input.settings
  const tierSettings = settings?.qualityTiers?.[tier]
  const count = finiteCountOrDefault(
    tierSettings?.count,
    finiteCountOrDefault(settings?.count, input.defaultCount ?? 36),
  )
  const lightCount = Math.min(
    count,
    finiteCountOrDefault(
      tierSettings?.lightCount,
      finiteCountOrDefault(settings?.lightCount, input.defaultLightCount ?? 8),
    ),
  )

  return {
    tier,
    count,
    lightCount,
    size: finiteNumberOrDefault(
      tierSettings?.size,
      finiteNumberOrDefault(settings?.size, input.defaultSize ?? 0.58),
    ),
    spriteIntensity: finiteNumberOrDefault(
      tierSettings?.spriteIntensity,
      finiteNumberOrDefault(
        settings?.spriteIntensity,
        input.defaultSpriteIntensity ?? 1.45,
      ),
    ),
  }
}
