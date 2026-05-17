import type { RuntimeAtmosphereDefinition } from '../../../atmosphere/runtimeAtmosphereTypes'
import type {
  BloomConfig,
  ToneMappingConfig,
} from '../../../stores/postProcessingStore'
import type { ResolvedRuntimeRenderProfile } from '../../../stores/runtimeRenderProfileStore'
import type { RuntimeVisualStyleSettings } from '../../../styles/runtimeVisualStyleStore'

export interface RuntimePostProcessingPolicy {
  exposure: number
  colorGradingEnabled: boolean
  colorSaturation: number
  colorContrast: number
  colorWarmth: number
  bloomEnabled: boolean
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
  ambientOcclusionEnabled: boolean
  ambientOcclusionIntensity: number
  ambientOcclusionRadius: number
  ambientOcclusionMinDistance: number
  ambientOcclusionMaxDistance: number
  depthFogEnabled: boolean
  kuwaharaEnabled: boolean
  kuwaharaRadius: number
  kuwaharaMix: number
  kuwaharaResolutionScale: number
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
  atmosphere,
}: {
  baseExposure: number
  visualStyle: RuntimeVisualStyleSettings
  bloom: BloomConfig
  toneMapping: ToneMappingConfig
  renderProfile?: ResolvedRuntimeRenderProfile
  atmosphere?: RuntimeAtmosphereDefinition
}): RuntimePostProcessingPolicy {
  const atmosphereEnabled = atmosphere?.enabled ?? true
  const grading = atmosphereEnabled
    ? atmosphere?.grading ?? visualStyle.colorGrading
    : {
        saturation: 1,
        contrast: 1,
        brightness: 1,
        warmth: 1,
      }
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
  const profileAllowsColorGrading =
    !profilePost ||
    allowedPasses.size === 0 ||
    allowedPasses.has('color-grading')
  const profileAllowsAmbientOcclusion =
    !profilePost ||
    allowedPasses.size === 0 ||
    allowedPasses.has('ambient-occlusion')
  const profileAllowsDepthFog =
    !profilePost || allowedPasses.size === 0 || allowedPasses.has('depth-fog')
  const profileAllowsKuwahara =
    !profilePost || allowedPasses.size === 0 || allowedPasses.has('kuwahara')
  const colorSaturation = clampNumber(grading.saturation, 0.35, 1.85)
  const colorContrast = clampNumber(grading.contrast, 0.55, 1.65)
  const colorWarmth = clampNumber(grading.warmth, 0.55, 1.45)
  const colorGradingEnabled =
    profileAllowsPost &&
    profileAllowsColorGrading &&
    (Math.abs(colorSaturation - 1) > 0.001 ||
      Math.abs(colorContrast - 1) > 0.001 ||
      Math.abs(colorWarmth - 1) > 0.001)
  const ambientOcclusion = profilePost?.ambientOcclusion
  const ambientOcclusionIntensity = ambientOcclusion?.intensity ?? 0
  const ambientOcclusionEnabled =
    profileAllowsPost &&
    profileAllowsAmbientOcclusion &&
    (ambientOcclusion?.enabled ?? false) &&
    ambientOcclusionIntensity > 0.01
  const depthFogEnabled =
    profileAllowsPost &&
    profileAllowsDepthFog &&
    atmosphereEnabled &&
    Boolean(
      (atmosphere?.distanceFog.enabled && atmosphere.distanceFog.density > 0) ||
        (atmosphere?.heightFog.enabled && atmosphere.heightFog.density > 0),
    )
  const kuwahara = profilePost?.kuwahara
  const kuwaharaRadius = Math.round(clampNumber(kuwahara?.radius ?? 2, 1, 4))
  const kuwaharaMix = clampNumber(kuwahara?.mix ?? 0.55, 0, 1)
  const kuwaharaResolutionScale = clampNumber(
    kuwahara?.resolutionScale ?? 0.75,
    0.35,
    1,
  )
  const kuwaharaEnabled =
    profileAllowsPost && profileAllowsKuwahara && (kuwahara?.enabled ?? false)
  const styleBloomIntensity = atmosphereEnabled
    ? atmosphere?.bloom.intensity ?? visualStyle.screenFx.bloomIntensity
    : 0
  const bloomEnabled =
    profileAllowsPost &&
    profileAllowsBloom &&
    atmosphereEnabled &&
    styleBloomIntensity > 0.001 &&
    bloom.enabled &&
    bloom.intensity > 0.01
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
    colorGradingEnabled,
    colorSaturation: colorGradingEnabled ? colorSaturation : 1,
    colorContrast: colorGradingEnabled ? colorContrast : 1,
    colorWarmth: colorGradingEnabled ? colorWarmth : 1,
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
      ((atmosphere?.bloom.threshold ?? visualStyle.screenFx.bloomThreshold) +
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
    depthFogEnabled,
    kuwaharaEnabled,
    kuwaharaRadius: kuwaharaEnabled ? kuwaharaRadius : 0,
    kuwaharaMix: kuwaharaEnabled ? kuwaharaMix : 0,
    kuwaharaResolutionScale: kuwaharaEnabled ? kuwaharaResolutionScale : 0.75,
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
