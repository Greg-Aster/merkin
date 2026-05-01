import type { QualitySettings } from '../OptimizationManager'

// Runtime visibility policy is the single authority for gameplay culling,
// light budgets, and shadow eligibility.
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

export interface RuntimeVisibilityPolicy {
  qualityTier: RuntimeQualityTier
  propBudget: RuntimePropBudget
  pointLightBudget: RuntimePointLightBudget
  shadowsEnabled: boolean
}

export interface RuntimePropVisibility {
  visible: boolean
  cullDistance: number
  castShadow: boolean
  receiveShadow: boolean
  frustumCulled: boolean
}

export interface RuntimePointLightVisibility {
  visible: boolean
  intensity: number
  distance: number
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

export function resolveRuntimeVisibilityPolicy(
  qualityTier: RuntimeQualityTier,
  qualitySettings: Pick<
    QualitySettings,
    'enableDynamicLighting' | 'enableShadows' | 'shadowMapSize'
  >,
): RuntimeVisibilityPolicy {
  return {
    qualityTier,
    propBudget: getRuntimePropBudget(qualityTier),
    pointLightBudget: getRuntimePointLightBudget(qualityTier, qualitySettings),
    shadowsEnabled: shouldEnableSceneShadows(qualityTier, qualitySettings),
  }
}

export function resolveRuntimePropVisibility({
  policy,
  distanceToCamera,
  boundingRadius,
  runtimeCulling,
  editorContext,
}: {
  policy: RuntimeVisibilityPolicy
  distanceToCamera: number
  boundingRadius: number
  runtimeCulling: boolean
  editorContext: boolean
}): RuntimePropVisibility {
  if (editorContext || !runtimeCulling) {
    return {
      visible: true,
      cullDistance: Number.POSITIVE_INFINITY,
      castShadow: editorContext,
      receiveShadow: editorContext,
      frustumCulled: false,
    }
  }

  const cullDistance = policy.propBudget.cullDistance + boundingRadius

  return {
    visible: distanceToCamera <= cullDistance,
    cullDistance,
    castShadow:
      policy.shadowsEnabled &&
      distanceToCamera <= policy.propBudget.shadowDistance,
    receiveShadow:
      policy.shadowsEnabled &&
      distanceToCamera <= policy.propBudget.receiveShadowDistance,
    frustumCulled: true,
  }
}

export function resolveRuntimePointLightVisibility({
  policy,
  distanceToCamera,
  sourceIntensity,
  sourceDistance,
}: {
  policy: RuntimeVisibilityPolicy
  distanceToCamera: number
  sourceIntensity: number
  sourceDistance: number
}): RuntimePointLightVisibility {
  const budget = policy.pointLightBudget
  const visible = budget.enabled && distanceToCamera <= budget.cullDistance

  return {
    visible,
    intensity: visible ? sourceIntensity * budget.intensityScale : 0,
    distance: visible ? sourceDistance * budget.rangeScale : 0,
  }
}

export function getRuntimeNodeCullDistance(
  qualityTier: RuntimeQualityTier,
  nodeKind: 'asset' | 'prefab' | 'primitive' | 'light' | string,
): number {
  const baseDistance = getRuntimePropBudget(qualityTier).cullDistance

  switch (nodeKind) {
    case 'light':
      return baseDistance * 0.4
    case 'primitive':
      return baseDistance * 0.85
    default:
      return baseDistance
  }
}
