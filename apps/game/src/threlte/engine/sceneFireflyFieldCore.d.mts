import type { ActorDefinition } from './types'

export type SceneFireflyQualityTier =
  | 'ultra_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'ultra'

export type SceneFireflyFieldDistribution = 'uniform' | 'center-falloff'

export interface SceneFireflyLightingSettingsLike {
  spriteIntensity?: number
  lightIntensity?: number
  lightDistance?: number
  lightDecay?: number
  minimumLightIntensityScale?: number
  lightBudgeted?: boolean
  selectionHoldSeconds?: number
  selectionFadeSeconds?: number
  pulseThreshold?: number
  pulseSoftness?: number
  activeLightPercent?: number
  blinkPeriodSecondsMin?: number
  blinkPeriodSecondsMax?: number
  blinkFadeSeconds?: number
}

export interface SceneFireflyFieldSettingsLike {
  enabled?: boolean
  allowWithAuthored?: boolean
  count?: number
  lightCount?: number
  activeLightPercent?: number
  qualityTiers?: Partial<
    Record<
      SceneFireflyQualityTier,
      {
        count?: number
        lightCount?: number
        activeLightPercent?: number
        blinkPeriodSecondsMin?: number
        blinkPeriodSecondsMax?: number
        blinkFadeSeconds?: number
        size?: number
        lighting?: SceneFireflyLightingSettingsLike
      }
    >
  >
  lighting?: SceneFireflyLightingSettingsLike
  radius?: number
  minHeight?: number
  maxHeight?: number
  center?: [number, number, number]
  distribution?: SceneFireflyFieldDistribution
  densityExponent?: number
  palette?: string[]
  interactive?: {
    enabled?: boolean
    profileChance?: number
    profileIds?: string[]
    durationMs?: number
    lostSoulResponses?: string[]
  }
  color?: string
  secondaryColor?: string
  twinkleSpeed?: number
  driftSpeed?: number
  sway?: number
  size?: number
}

export interface ResolvedSceneFireflyLighting {
  spriteIntensity: number
  lightIntensity: number
  lightDistance: number
  lightDecay: number
  minimumLightIntensityScale: number
  lightBudgeted: boolean
  selectionHoldSeconds: number
  selectionFadeSeconds: number
  pulseThreshold: number
  pulseSoftness: number
  activeLightPercent: number
  blinkPeriodSecondsMin: number
  blinkPeriodSecondsMax: number
  blinkFadeSeconds: number
}

export interface ResolvedSceneFireflyFieldQuality {
  tier: SceneFireflyQualityTier
  count: number
  activeLightPercent: number
  activeLightCount: number
  lightCount: number
  size: number
  lighting: ResolvedSceneFireflyLighting
}

export interface SceneFireflyFieldPoint {
  localX: number
  localZ: number
  normalizedDistance: number
}

export const SCENE_FIREFLY_QUALITY_TIERS: SceneFireflyQualityTier[]
export const SCENE_FIREFLY_FIELD_DISTRIBUTIONS: SceneFireflyFieldDistribution[]
export const DEFAULT_SCENE_FIREFLY_LIGHTING: ResolvedSceneFireflyLighting

export function normalizeSceneFireflyQualityTier(
  tier: string | null | undefined,
): SceneFireflyQualityTier

export function normalizeSceneFireflyFieldDistribution(
  distribution: string | null | undefined,
): SceneFireflyFieldDistribution

export function resolveSceneFireflyFieldRadius(
  value: unknown,
  fallback?: number,
): number

export function getSceneFireflyFieldCoverage(input: {
  radius: unknown
  fallbackRadius?: number
}): {
  radius: number
  diameter: number
  area: number
}

export function seededSceneFireflyUnit(index: number, salt: number): number

export function resolveSceneFireflyFieldPoint(input: {
  index: number
  count: number
  radius: number
  distribution: string | null | undefined
  densityExponent?: number
}): SceneFireflyFieldPoint

export function resolveSceneFireflyLighting(input: {
  settings: SceneFireflyFieldSettingsLike | null | undefined
  qualityTier: string | null | undefined
  defaults?: Partial<ResolvedSceneFireflyLighting>
}): ResolvedSceneFireflyLighting

export function resolveSceneFireflyActiveLightPercent(input: {
  count: number
  activeLightPercent?: number
  lightingActiveLightPercent?: number
  baseActiveLightPercent?: number
  baseLightingActiveLightPercent?: number
  legacyLightCount?: number
  baseLegacyLightCount?: number
  defaultLightCount?: number
}): number

export function resolveSceneFireflyActiveLightCount(
  count: number,
  activeLightPercent: number,
): number

export function getSceneFireflyLightEmitterIndices(
  count: number,
  activeLightCount: number,
): Set<number>

export function resolveSceneFireflyBlinkPeriodSeconds(input: {
  index: number
  lighting?: ResolvedSceneFireflyLighting
}): number

export function resolveSceneFireflyTwinkleSpeedFromBlinkPeriod(
  periodSeconds: number,
): number

export function resolveSceneFireflyFieldQuality(input: {
  settings: SceneFireflyFieldSettingsLike | null | undefined
  qualityTier: string | null | undefined
  defaultCount?: number
  defaultLightCount?: number
  defaultSize?: number
  defaultSpriteIntensity?: number
}): ResolvedSceneFireflyFieldQuality

export function createSceneFireflyPopulationActors(
  scene: {
    levelId: string
    settings?: {
      level?: {
        features?: { fireflies?: boolean }
        spawn?: { position?: [number, number, number] }
        fireflies?: SceneFireflyFieldSettingsLike
      }
    }
    nodes?: Array<{
      npc?: {
        archetype?: string
        presentation?: { type?: string }
      }
    }>
  },
  options?: {
    qualityTier?: string | null
    defaultCount?: number
    defaultLightCount?: number
    defaultSize?: number
    defaultSpriteIntensity?: number
  },
): ActorDefinition[]
