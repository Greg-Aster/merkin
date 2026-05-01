import type {
  BloomConfig,
  ToneMappingConfig,
} from '../../../stores/postProcessingStore'
import type { RuntimeVisualStyleSettings } from '../../../styles/runtimeVisualStyleStore'

export interface RuntimePostProcessingPolicy {
  exposure: number
  bloomEnabled: boolean
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
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
}: {
  baseExposure: number
  visualStyle: RuntimeVisualStyleSettings
  bloom: BloomConfig
  toneMapping: ToneMappingConfig
}): RuntimePostProcessingPolicy {
  const grading = visualStyle.colorGrading
  const bloomEnabled = bloom.enabled && bloom.intensity > 0.01
  const styleBloomIntensity = visualStyle.screenFx.bloomIntensity

  return {
    exposure:
      baseExposure *
      visualStyle.toneMappingExposure *
      toneMapping.exposure *
      clampNumber(grading.brightness, 0.82, 1.08),
    bloomEnabled,
    bloomStrength: bloomEnabled
      ? clampNumber(styleBloomIntensity * bloom.intensity * 0.85, 0, 1.35)
      : 0,
    bloomRadius: clampNumber(0.2 + styleBloomIntensity * 0.7, 0.18, 0.85),
    bloomThreshold: clampNumber(
      (visualStyle.screenFx.bloomThreshold + bloom.threshold) * 0.5,
      0.58,
      0.98,
    ),
    vignetteStrength: clampNumber(
      visualStyle.screenFx.vignetteStrength * 0.5,
      0.04,
      0.26,
    ),
  }
}
