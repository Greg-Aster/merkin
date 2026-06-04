import type { SharedLevelFireflySettings } from './sceneDocumentTypes'

export type SceneFireflyFieldSettings = NonNullable<
  SharedLevelFireflySettings['fireflies']
>
export type SceneFireflyLightingSettings = NonNullable<
  SceneFireflyFieldSettings['lighting']
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
  lighting: ResolvedSceneFireflyLighting
}

export interface ResolvedSceneFireflyLighting {
  spriteIntensity: number
  lightIntensity: number
  lightDistance: number
  lightDecay: number
  minimumLightIntensityScale: number
  lightBudgeted: boolean
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

function finiteClampedNumberOrDefault(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const resolved = finiteNumberOrDefault(value, fallback)
  return Math.min(max, Math.max(min, resolved))
}

export const DEFAULT_SCENE_FIREFLY_LIGHTING: ResolvedSceneFireflyLighting = {
  spriteIntensity: 1.45,
  lightIntensity: 44,
  lightDistance: 28,
  lightDecay: 1.35,
  minimumLightIntensityScale: 0.16,
  lightBudgeted: true,
}

export function resolveSceneFireflyLighting(input: {
  settings: SceneFireflyFieldSettings | null | undefined
  qualityTier: string | null | undefined
  defaults?: Partial<ResolvedSceneFireflyLighting>
}): ResolvedSceneFireflyLighting {
  const tier = normalizeSceneFireflyQualityTier(input.qualityTier)
  const baseLighting = input.settings?.lighting
  const tierLighting = input.settings?.qualityTiers?.[tier]?.lighting
  const defaults = {
    ...DEFAULT_SCENE_FIREFLY_LIGHTING,
    ...(input.defaults ?? {}),
  }

  return {
    spriteIntensity: finiteNumberOrDefault(
      tierLighting?.spriteIntensity,
      finiteNumberOrDefault(baseLighting?.spriteIntensity, defaults.spriteIntensity),
    ),
    lightIntensity: finiteNumberOrDefault(
      tierLighting?.lightIntensity,
      finiteNumberOrDefault(baseLighting?.lightIntensity, defaults.lightIntensity),
    ),
    lightDistance: finiteNumberOrDefault(
      tierLighting?.lightDistance,
      finiteNumberOrDefault(baseLighting?.lightDistance, defaults.lightDistance),
    ),
    lightDecay: finiteNumberOrDefault(
      tierLighting?.lightDecay,
      finiteNumberOrDefault(baseLighting?.lightDecay, defaults.lightDecay),
    ),
    minimumLightIntensityScale: finiteClampedNumberOrDefault(
      tierLighting?.minimumLightIntensityScale,
      finiteClampedNumberOrDefault(
        baseLighting?.minimumLightIntensityScale,
        defaults.minimumLightIntensityScale,
        0,
        1,
      ),
      0,
      1,
    ),
    lightBudgeted:
      tierLighting?.lightBudgeted ??
      baseLighting?.lightBudgeted ??
      defaults.lightBudgeted,
  }
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
  const lighting = resolveSceneFireflyLighting({
    settings,
    qualityTier: tier,
    defaults: {
      spriteIntensity: input.defaultSpriteIntensity ?? 1.45,
    },
  })
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
    lighting,
  }
}
