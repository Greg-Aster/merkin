import type { SharedLevelFireflySettings } from './sceneDocumentTypes'
import type {
  ResolvedSceneFireflyFieldQuality,
  ResolvedSceneFireflyLighting,
  SceneFireflyFieldDistribution,
  SceneFireflyFieldPoint,
  SceneFireflyQualityTier,
} from './sceneFireflyFieldCore.mjs'

export type SceneFireflyFieldSettings = NonNullable<
  SharedLevelFireflySettings['fireflies']
>
export type SceneFireflyLightingSettings = NonNullable<
  SceneFireflyFieldSettings['lighting']
>

export type {
  ResolvedSceneFireflyFieldQuality,
  ResolvedSceneFireflyLighting,
  SceneFireflyFieldDistribution,
  SceneFireflyFieldPoint,
  SceneFireflyQualityTier,
}

export {
  createSceneFireflyPopulationActors,
  DEFAULT_SCENE_FIREFLY_LIGHTING,
  getSceneFireflyFieldCoverage,
  getSceneFireflyLightEmitterIndices,
  normalizeSceneFireflyFieldDistribution,
  normalizeSceneFireflyQualityTier,
  resolveSceneFireflyActiveLightCount,
  resolveSceneFireflyActiveLightPercent,
  resolveSceneFireflyBlinkPeriodSeconds,
  resolveSceneFireflyFieldPoint,
  resolveSceneFireflyFieldQuality,
  resolveSceneFireflyFieldRadius,
  resolveSceneFireflyLighting,
  resolveSceneFireflyTwinkleSpeedFromBlinkPeriod,
  seededSceneFireflyUnit,
} from './sceneFireflyFieldCore.mjs'
