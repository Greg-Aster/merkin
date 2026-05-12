import type {
  BloomConfig,
  ToneMappingConfig,
} from '../../../stores/postProcessingStore'
import type { ResolvedRuntimeRenderProfile } from '../../../stores/runtimeRenderProfileStore'
import type { RuntimeVisualStyleSettings } from '../../../styles/runtimeVisualStyleStore'

export interface RuntimePostProcessingPolicy {
  exposure: number
  bloomEnabled: boolean
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
  ambientOcclusionEnabled: boolean
  ambientOcclusionIntensity: number
  ambientOcclusionRadius: number
  ambientOcclusionMinDistance: number
  ambientOcclusionMaxDistance: number
  vignetteStrength: number
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function resolveRuntimePostProcessingPolicy({
  baseExposure,
  visualStyle,
  bloom,
  toneMapping,
  renderProfile,
}: {
  baseExposure: number
  visualStyle: RuntimeVisualStyleSettings
  bloom: BloomConfig
  toneMapping: ToneMappingConfig
  renderProfile?: ResolvedRuntimeRenderProfile
}): RuntimePostProcessingPolicy {
  const grading = visualStyle.colorGrading
  const profilePost = renderProfile?.postProcessing
  const allowedPasses = new Set(profilePost?.passes ?? [])
  const profileAllowsPost = profilePost?.enabled ?? true
  const profileAllowsBloom =
    !profilePost || allowedPasses.size === 0 || allowedPasses.has('bloom')
  const profileAllowsVignette =
    !profilePost || allowedPasses.size === 0 || allowedPasses.has('vignette')
  const profileAllowsToneMapping =
    !profilePost ||
    allowedPasses.size === 0 ||
    allowedPasses.has('tone-mapping')
  const profileAllowsAmbientOcclusion =
    !profilePost ||
    allowedPasses.size === 0 ||
    allowedPasses.has('ambient-occlusion')
  const bloomEnabled =
    profileAllowsPost &&
    profileAllowsBloom &&
    renderProfile?.tier !== 'desktop' &&
    bloom.enabled &&
    bloom.intensity > 0.01
  const ambientOcclusion = profilePost?.ambientOcclusion
  const ambientOcclusionIntensity = ambientOcclusion?.intensity ?? 0
  const ambientOcclusionEnabled =
    profileAllowsPost &&
    profileAllowsAmbientOcclusion &&
    renderProfile?.tier !== 'desktop' &&
    (ambientOcclusion?.enabled ?? false) &&
    ambientOcclusionIntensity > 0.01
  const styleBloomIntensity = visualStyle.screenFx.bloomIntensity
  const bloomIntensityScale = profilePost?.bloom.intensity ?? 1
  const toneMappingExposure = profileAllowsToneMapping
    ? profilePost?.toneMappingExposure ?? 1
    : 1

  return {
    exposure:
      baseExposure *
      visualStyle.toneMappingExposure *
      toneMapping.exposure *
      toneMappingExposure *
      clampNumber(grading.brightness, 0.82, 1.08),
    bloomEnabled,
    bloomStrength: bloomEnabled
      ? clampNumber(
          styleBloomIntensity * bloom.intensity * 0.85 * bloomIntensityScale,
          0,
          1.35,
        )
      : 0,
    bloomRadius: clampNumber(0.2 + styleBloomIntensity * 0.7, 0.18, 0.85),
    bloomThreshold: clampNumber(
      (visualStyle.screenFx.bloomThreshold +
        bloom.threshold +
        (profilePost?.bloom.threshold ?? bloom.threshold)) /
        3,
      0.58,
      0.98,
    ),
    ambientOcclusionEnabled,
    ambientOcclusionIntensity: ambientOcclusionEnabled
      ? clampNumber(ambientOcclusionIntensity, 0, 1.4)
      : 0,
    ambientOcclusionRadius: ambientOcclusionEnabled
      ? clampNumber(ambientOcclusion?.radius ?? 8, 2, 14)
      : 0,
    ambientOcclusionMinDistance: ambientOcclusionEnabled
      ? clampNumber(ambientOcclusion?.minDistance ?? 0.006, 0.001, 0.04)
      : 0.006,
    ambientOcclusionMaxDistance: ambientOcclusionEnabled
      ? clampNumber(ambientOcclusion?.maxDistance ?? 0.12, 0.02, 0.35)
      : 0.12,
    vignetteStrength: clampNumber(
      profileAllowsPost && profileAllowsVignette
        ? visualStyle.screenFx.vignetteStrength *
            0.5 *
            (profilePost?.vignetteStrength ?? 1)
        : 0,
      0,
      0.26,
    ),
  }
}
