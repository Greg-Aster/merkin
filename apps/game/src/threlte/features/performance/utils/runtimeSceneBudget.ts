import type { QualitySettings } from '../OptimizationManager'

export type RuntimeQualityTier =
  | 'ultra_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'ultra'

export interface RuntimePropBudget {
  cullDistance: number
  shadowDistance: number
  receiveShadowDistance: number
}

export interface RuntimePointLightBudget {
  enabled: boolean
  cullDistance: number
  intensityScale: number
  rangeScale: number
}

const PROP_BUDGETS: Record<RuntimeQualityTier, RuntimePropBudget> = {
  ultra_low: {
    cullDistance: 45,
    shadowDistance: 0,
    receiveShadowDistance: 0,
  },
  low: {
    cullDistance: 65,
    shadowDistance: 0,
    receiveShadowDistance: 0,
  },
  medium: {
    cullDistance: 95,
    shadowDistance: 12,
    receiveShadowDistance: 24,
  },
  high: {
    cullDistance: 140,
    shadowDistance: 24,
    receiveShadowDistance: 42,
  },
  ultra: {
    cullDistance: 180,
    shadowDistance: 36,
    receiveShadowDistance: 64,
  },
}

const POINT_LIGHT_BUDGETS: Record<RuntimeQualityTier, RuntimePointLightBudget> =
  {
    ultra_low: {
      enabled: false,
      cullDistance: 0,
      intensityScale: 0,
      rangeScale: 0,
    },
    low: {
      enabled: false,
      cullDistance: 0,
      intensityScale: 0,
      rangeScale: 0,
    },
    medium: {
      enabled: true,
      cullDistance: 18,
      intensityScale: 0.72,
      rangeScale: 0.75,
    },
    high: {
      enabled: true,
      cullDistance: 28,
      intensityScale: 0.88,
      rangeScale: 0.9,
    },
    ultra: {
      enabled: true,
      cullDistance: 40,
      intensityScale: 1,
      rangeScale: 1,
    },
  }

export function getRuntimePropBudget(
  qualityTier: RuntimeQualityTier,
): RuntimePropBudget {
  return PROP_BUDGETS[qualityTier]
}

export function getRuntimePointLightBudget(
  qualityTier: RuntimeQualityTier,
  qualitySettings: Pick<QualitySettings, 'enableDynamicLighting'>,
): RuntimePointLightBudget {
  const baseBudget = POINT_LIGHT_BUDGETS[qualityTier]
  if (!qualitySettings.enableDynamicLighting) {
    return {
      ...baseBudget,
      enabled: false,
      intensityScale: 0,
      rangeScale: 0,
      cullDistance: 0,
    }
  }

  return baseBudget
}

export function shouldEnableSceneShadows(
  qualityTier: RuntimeQualityTier,
  qualitySettings: Pick<QualitySettings, 'enableShadows' | 'shadowMapSize'>,
): boolean {
  return (
    qualitySettings.enableShadows &&
    qualitySettings.shadowMapSize > 0 &&
    qualityTier !== 'ultra_low' &&
    qualityTier !== 'low'
  )
}
