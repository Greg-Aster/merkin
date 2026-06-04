import { writable } from 'svelte/store'
import type {
  RenderProfileLightingSettings,
  RenderProfilePlatformTier,
  RenderProfilePostProcessingSettings,
  RenderProfileReflectionSettings,
  RenderProfileShadowSettings,
  RenderProfileVisualBookmark,
  SharedLevelRenderProfileSettings,
} from '../engine/sceneDocumentTypes'
import type { RuntimeQualityTier } from '../features/performance/utils/runtimeSceneBudget'

export interface ResolvedRuntimeRenderProfile {
  id: string
  tier: RenderProfilePlatformTier
  lighting: RenderProfileLightingSettings
  shadows: Required<
    Pick<
      RenderProfileShadowSettings,
      'enabled' | 'maxCastingLights' | 'mapSize' | 'cameraSize' | 'cameraFar'
    >
  >
  reflections: Required<
    Pick<
      RenderProfileReflectionSettings,
      | 'mode'
      | 'source'
      | 'textureSize'
      | 'maxPlanarSurfaces'
      | 'environmentIntensity'
      | 'requiredAssetUrls'
      | 'estimatedTextureBytes'
      | 'estimatedRenderPasses'
    >
  > & {
    intent?: string
  }
  postProcessing: Required<
    Pick<
      RenderProfilePostProcessingSettings,
      | 'enabled'
      | 'passes'
      | 'maxEnabledPasses'
      | 'toneMappingExposure'
      | 'vignetteStrength'
    >
  > & {
    bloom: Required<NonNullable<RenderProfilePostProcessingSettings['bloom']>>
    ambientOcclusion: Required<
      NonNullable<RenderProfilePostProcessingSettings['ambientOcclusion']>
    >
    kuwahara: Required<
      NonNullable<RenderProfilePostProcessingSettings['kuwahara']>
    >
  }
  visualBookmarks: RenderProfileVisualBookmark[]
}

const DEFAULT_RENDER_PROFILE: ResolvedRuntimeRenderProfile = {
  id: 'runtime-default',
  tier: 'desktop',
  lighting: {
    ambientColor: '#cfe4ff',
    skyColor: '#dbe9ff',
    groundColor: '#1b2130',
    keyLightColor: '#d7e6ff',
    fillLightColor: '#50688f',
    keyLightPosition: [14, 20, -10],
    fillLightPosition: [-16, 10, 18],
  },
  shadows: {
    enabled: true,
    maxCastingLights: 1,
    mapSize: 1024,
    cameraSize: 48,
    cameraFar: 90,
  },
  reflections: {
    mode: 'static-environment',
    source: 'skybox',
    intent: 'Default skybox environment response for authored PBR surfaces.',
    textureSize: 256,
    maxPlanarSurfaces: 0,
    environmentIntensity: 1,
    requiredAssetUrls: [],
    estimatedTextureBytes: 0,
    estimatedRenderPasses: 0,
  },
  postProcessing: {
    enabled: true,
    passes: [
      'tone-mapping',
      'depth-fog',
      'ambient-occlusion',
      'color-grading',
      'bloom',
      'vignette',
    ],
    maxEnabledPasses: 6,
    ambientOcclusion: {
      enabled: true,
      intensity: 0.78,
      radius: 8,
      minDistance: 0.006,
      maxDistance: 0.12,
    },
    kuwahara: {
      enabled: false,
      radius: 2,
      mix: 0.55,
      resolutionScale: 1,
    },
    bloom: {
      intensity: 1,
      threshold: 0.86,
    },
    toneMappingExposure: 1,
    vignetteStrength: 1,
  },
  visualBookmarks: [],
}

function mergeRecord<T extends object>(
  base: T,
  override: Partial<T> | undefined,
): T {
  return {
    ...base,
    ...(override ?? {}),
  }
}

function mergeLightingSettings(
  base: RenderProfileLightingSettings,
  override: RenderProfileLightingSettings | undefined,
): RenderProfileLightingSettings {
  return {
    ...base,
    ...(override ?? {}),
    pointLightBudget: {
      ...(base.pointLightBudget ?? {}),
      ...(override?.pointLightBudget ?? {}),
      groupBudgets: {
        ...(base.pointLightBudget?.groupBudgets ?? {}),
        ...(override?.pointLightBudget?.groupBudgets ?? {}),
      },
    },
  }
}

function mergePostProcessingSettings(
  base: ResolvedRuntimeRenderProfile['postProcessing'],
  override: RenderProfilePostProcessingSettings | undefined,
): ResolvedRuntimeRenderProfile['postProcessing'] {
  return {
    ...base,
    ...(override ?? {}),
    bloom: mergeRecord(base.bloom, override?.bloom),
    ambientOcclusion: mergeRecord(
      base.ambientOcclusion,
      override?.ambientOcclusion,
    ),
    kuwahara: mergeRecord(base.kuwahara, override?.kuwahara),
  }
}

function getPlatformTier(
  qualityTier: RuntimeQualityTier,
  fallback: RenderProfilePlatformTier,
): RenderProfilePlatformTier {
  if (qualityTier === 'ultra_low' || qualityTier === 'low') return 'mobile'
  if (qualityTier === 'ultra') return 'tv'
  return fallback
}

export function resolveRuntimeRenderProfile(
  profileSettings:
    | SharedLevelRenderProfileSettings['renderProfile']
    | undefined,
  qualityTier: RuntimeQualityTier,
): ResolvedRuntimeRenderProfile {
  const tier = getPlatformTier(
    qualityTier,
    profileSettings?.defaultTier ?? DEFAULT_RENDER_PROFILE.tier,
  )
  const tierSettings = profileSettings?.qualityTiers?.[tier]
  const shadows = mergeRecord(
    mergeRecord(DEFAULT_RENDER_PROFILE.shadows, profileSettings?.shadows),
    tierSettings?.shadows,
  )
  const reflections = mergeRecord(
    mergeRecord(
      DEFAULT_RENDER_PROFILE.reflections,
      profileSettings?.reflections,
    ),
    tierSettings?.reflections,
  )
  const postProcessing = mergePostProcessingSettings(
    mergePostProcessingSettings(
      DEFAULT_RENDER_PROFILE.postProcessing,
      profileSettings?.postProcessing,
    ),
    tierSettings?.postProcessing,
  )

  return {
    id: profileSettings?.id ?? DEFAULT_RENDER_PROFILE.id,
    tier,
    lighting: mergeLightingSettings(
      mergeLightingSettings(
        DEFAULT_RENDER_PROFILE.lighting,
        profileSettings?.lighting,
      ),
      tierSettings?.lighting,
    ),
    shadows,
    reflections,
    postProcessing,
    visualBookmarks: profileSettings?.visualBookmarks ?? [],
  }
}

export const runtimeRenderProfileStore = writable(DEFAULT_RENDER_PROFILE)

export function replaceRuntimeRenderProfile(
  profile: ResolvedRuntimeRenderProfile,
) {
  runtimeRenderProfileStore.set(profile)
}

export function resetRuntimeRenderProfile() {
  runtimeRenderProfileStore.set(DEFAULT_RENDER_PROFILE)
}
