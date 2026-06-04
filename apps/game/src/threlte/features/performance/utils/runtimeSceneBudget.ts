import type { QualitySettings } from '../OptimizationManager'
import type {
  RuntimeLightBudgetGroup,
  RuntimePointLightBudgetSettings,
} from '../../../engine/sceneDocumentTypes'

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
  maxVisibleCount: number
  maxDistance: number
  intensityScale: number
  rangeScale: number
  selectionHoldSeconds: number
  selectionHysteresis: number
  groupBudgets: Partial<
    Record<RuntimeLightBudgetGroup, RuntimePointLightGroupBudget>
  >
}

export interface RuntimePointLightGroupBudget {
  maxVisibleCount: number
  priority: number
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

const DEFAULT_POINT_LIGHT_GROUP_BUDGETS: Partial<
  Record<RuntimeLightBudgetGroup, RuntimePointLightGroupBudget>
> = {
  player: { maxVisibleCount: Number.POSITIVE_INFINITY, priority: 100 },
  authored: { maxVisibleCount: Number.POSITIVE_INFINITY, priority: 80 },
  'firefly-npc': { maxVisibleCount: Number.POSITIVE_INFINITY, priority: 72 },
  shockwave: { maxVisibleCount: Number.POSITIVE_INFINITY, priority: 52 },
  'ambient-vfx': { maxVisibleCount: Number.POSITIVE_INFINITY, priority: 30 },
  diagnostic: { maxVisibleCount: Number.POSITIVE_INFINITY, priority: 10 },
}

function getDefaultPointLightGroupBudgets(): RuntimePointLightBudget['groupBudgets'] {
  return Object.fromEntries(
    Object.entries(DEFAULT_POINT_LIGHT_GROUP_BUDGETS).map(([group, budget]) => [
      group,
      { ...budget },
    ]),
  ) as RuntimePointLightBudget['groupBudgets']
}

const POINT_LIGHT_BUDGETS: Record<RuntimeQualityTier, RuntimePointLightBudget> =
  {
    ultra_low: {
      enabled: false,
      maxVisibleCount: 0,
      maxDistance: 0,
      intensityScale: 0,
      rangeScale: 0,
      selectionHoldSeconds: 0,
      selectionHysteresis: 0,
      groupBudgets: getDefaultPointLightGroupBudgets(),
    },
    low: {
      enabled: false,
      maxVisibleCount: 0,
      maxDistance: 0,
      intensityScale: 0,
      rangeScale: 0,
      selectionHoldSeconds: 0,
      selectionHysteresis: 0,
      groupBudgets: getDefaultPointLightGroupBudgets(),
    },
    medium: {
      enabled: true,
      maxVisibleCount: 4,
      maxDistance: 10,
      intensityScale: 0.72,
      rangeScale: 0.75,
      selectionHoldSeconds: 1.6,
      selectionHysteresis: 0.18,
      groupBudgets: getDefaultPointLightGroupBudgets(),
    },
    high: {
      enabled: true,
      maxVisibleCount: 8,
      maxDistance: 16,
      intensityScale: 0.88,
      rangeScale: 0.9,
      selectionHoldSeconds: 2.2,
      selectionHysteresis: 0.16,
      groupBudgets: getDefaultPointLightGroupBudgets(),
    },
    ultra: {
      enabled: true,
      maxVisibleCount: 12,
      maxDistance: 24,
      intensityScale: 1,
      rangeScale: 1,
      selectionHoldSeconds: 2.8,
      selectionHysteresis: 0.14,
      groupBudgets: getDefaultPointLightGroupBudgets(),
    },
  }

const RUNTIME_LIGHT_BUDGET_GROUPS: RuntimeLightBudgetGroup[] = [
  'player',
  'authored',
  'firefly-npc',
  'shockwave',
  'ambient-vfx',
  'diagnostic',
]

function finiteNumberOrDefault(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function finiteCountOrDefault(value: unknown, fallback: number) {
  return Math.max(0, Math.floor(finiteNumberOrDefault(value, fallback)))
}

function resolvePointLightGroupBudgets(
  baseGroupBudgets: RuntimePointLightBudget['groupBudgets'],
  settings: RuntimePointLightBudgetSettings | null | undefined,
): RuntimePointLightBudget['groupBudgets'] {
  if (!settings?.groupBudgets) return { ...baseGroupBudgets }

  const nextGroupBudgets: RuntimePointLightBudget['groupBudgets'] = {
    ...baseGroupBudgets,
  }
  for (const group of RUNTIME_LIGHT_BUDGET_GROUPS) {
    const groupSettings = settings.groupBudgets[group]
    if (!groupSettings) continue

    const baseGroupBudget = nextGroupBudgets[group]
    nextGroupBudgets[group] = {
      maxVisibleCount: finiteCountOrDefault(
        groupSettings.maxVisibleCount,
        baseGroupBudget?.maxVisibleCount ?? Number.POSITIVE_INFINITY,
      ),
      priority: finiteNumberOrDefault(
        groupSettings.priority,
        baseGroupBudget?.priority ?? 0,
      ),
    }
  }

  return nextGroupBudgets
}

function resolvePointLightBudgetSettings(
  baseBudget: RuntimePointLightBudget,
  settings: RuntimePointLightBudgetSettings | null | undefined,
): RuntimePointLightBudget {
  if (!settings) return baseBudget

  return {
    enabled: settings.enabled ?? baseBudget.enabled,
    maxVisibleCount: finiteCountOrDefault(
      settings.maxVisibleCount,
      baseBudget.maxVisibleCount,
    ),
    maxDistance: Math.max(
      0,
      finiteNumberOrDefault(settings.maxDistance, baseBudget.maxDistance),
    ),
    intensityScale: Math.max(
      0,
      finiteNumberOrDefault(settings.intensityScale, baseBudget.intensityScale),
    ),
    rangeScale: Math.max(
      0,
      finiteNumberOrDefault(settings.rangeScale, baseBudget.rangeScale),
    ),
    selectionHoldSeconds: Math.max(
      0,
      finiteNumberOrDefault(
        settings.selectionHoldSeconds,
        baseBudget.selectionHoldSeconds,
      ),
    ),
    selectionHysteresis: Math.max(
      0,
      finiteNumberOrDefault(
        settings.selectionHysteresis,
        baseBudget.selectionHysteresis,
      ),
    ),
    groupBudgets: resolvePointLightGroupBudgets(
      baseBudget.groupBudgets,
      settings,
    ),
  }
}

export function getRuntimePropBudget(
  qualityTier: RuntimeQualityTier,
): RuntimePropBudget {
  return PROP_BUDGETS[qualityTier]
}

export function getRuntimePointLightBudget(
  qualityTier: RuntimeQualityTier,
  qualitySettings: Pick<QualitySettings, 'enableDynamicLighting'>,
  budgetSettings?: RuntimePointLightBudgetSettings | null,
): RuntimePointLightBudget {
  const baseBudget = resolvePointLightBudgetSettings(
    POINT_LIGHT_BUDGETS[qualityTier],
    budgetSettings,
  )
  if (!qualitySettings.enableDynamicLighting) {
    return {
      ...baseBudget,
      enabled: false,
      intensityScale: 0,
      rangeScale: 0,
      maxVisibleCount: 0,
      maxDistance: 0,
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
  budgetSettings?: RuntimePointLightBudgetSettings | null,
): RuntimeVisibilityPolicy {
  return {
    qualityTier,
    propBudget: getRuntimePropBudget(qualityTier),
    pointLightBudget: getRuntimePointLightBudget(
      qualityTier,
      qualitySettings,
      budgetSettings,
    ),
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
  sourceIntensity,
  sourceDistance,
}: {
  policy: RuntimeVisibilityPolicy
  sourceIntensity: number
  sourceDistance: number
}): RuntimePointLightVisibility {
  const budget = policy.pointLightBudget
  const sourceEnabled = sourceIntensity > 0
  const visible = sourceEnabled && budget.enabled
  const sourceRange = sourceDistance > 0 ? sourceDistance : budget.maxDistance
  const maximumDistance =
    budget.maxDistance > 0 ? budget.maxDistance : Number.POSITIVE_INFINITY
  const resolvedDistance = Math.min(
    sourceRange * budget.rangeScale,
    maximumDistance,
  )

  return {
    visible,
    intensity: visible ? sourceIntensity * budget.intensityScale : 0,
    distance: visible ? resolvedDistance : 0,
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
