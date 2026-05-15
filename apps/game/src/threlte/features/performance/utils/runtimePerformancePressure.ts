export type RuntimePerformancePressureLevel = 'ready' | 'warning' | 'critical'

export interface RuntimePerformancePressureMetric {
  id: string
  label: string
  value: number
  budget: number
  valueLabel: string
  budgetLabel: string
  level: RuntimePerformancePressureLevel
  ratio: number
  action: string
}

export interface RuntimePerformancePressureSignal {
  level: RuntimePerformancePressureLevel
  headline: string
  message: string
  bottlenecks: RuntimePerformancePressureMetric[]
  metrics: RuntimePerformancePressureMetric[]
}

export interface RuntimePerformanceSummary {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  recommendations: string[]
}

export interface RuntimePerformancePressureInput {
  fps: number
  frameTimeMs: number
  targetFps?: number
  lowFps?: number
  renderInfo?: {
    calls?: number
    triangles?: number
  }
  memory?: {
    textures?: number
  }
  longTasks?: {
    supported?: boolean
    lastDuration?: number
    maxDuration?: number
  }
  streaming?: {
    activeActorCount?: number
    activeRenderableActorCount?: number
    activeCellCount?: number
    totalCellCount?: number
    selectedAssetTier?: string
    renderQualityTier?: string
    gltfCacheBytes?: number
    gltfCacheUnreferencedBytes?: number
    gltfCachePendingBytes?: number
  }
  gltfCache?: {
    loadedBytes?: number
    pendingBytes?: number
    unreferencedBytes?: number
  }
}

const severityRank: Record<RuntimePerformancePressureLevel, number> = {
  ready: 0,
  warning: 1,
  critical: 2,
}

function finiteNumber(value: unknown, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback
}

export function formatRuntimePressureNumber(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return `${Math.round(value)}`
}

export function formatRuntimePressureBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0MB'
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}

function highMetric({
  id,
  label,
  value,
  warning,
  critical,
  action,
  formatter = formatRuntimePressureNumber,
}: {
  id: string
  label: string
  value: number
  warning: number
  critical: number
  action: string
  formatter?: (value: number) => string
}): RuntimePerformancePressureMetric {
  const level =
    value >= critical ? 'critical' : value >= warning ? 'warning' : 'ready'
  return {
    id,
    label,
    value,
    budget: warning,
    valueLabel: formatter(value),
    budgetLabel: formatter(warning),
    level,
    ratio: warning > 0 ? value / warning : 0,
    action,
  }
}

function lowMetric({
  id,
  label,
  value,
  target,
  warning,
  critical,
  action,
  formatter = formatRuntimePressureNumber,
}: {
  id: string
  label: string
  value: number
  target: number
  warning: number
  critical: number
  action: string
  formatter?: (value: number) => string
}): RuntimePerformancePressureMetric {
  const level =
    value <= critical ? 'critical' : value <= warning ? 'warning' : 'ready'
  return {
    id,
    label,
    value,
    budget: target,
    valueLabel: formatter(value),
    budgetLabel: formatter(target),
    level,
    ratio: value > 0 ? warning / value : Number.POSITIVE_INFINITY,
    action,
  }
}

function getMetricSortScore(metric: RuntimePerformancePressureMetric) {
  return severityRank[metric.level] * 100 + metric.ratio
}

function getMetricPenalty(metric: RuntimePerformancePressureMetric) {
  if (metric.level === 'ready') return 0

  const severityPenalty = metric.level === 'critical' ? 24 : 12
  const ratioPenalty = Number.isFinite(metric.ratio)
    ? Math.min(
        metric.level === 'critical' ? 16 : 8,
        Math.max(0, metric.ratio - 1) * 6,
      )
    : metric.level === 'critical'
      ? 16
      : 8

  return severityPenalty + ratioPenalty
}

function getGrade(score: number): RuntimePerformanceSummary['grade'] {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

export function summarizeRuntimePerformancePressure(
  signal: RuntimePerformancePressureSignal,
): RuntimePerformanceSummary {
  const penalty = signal.metrics.reduce(
    (sum, metric) => sum + getMetricPenalty(metric),
    0,
  )
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)))
  const recommendations = signal.bottlenecks
    .slice(0, 3)
    .map(metric => `${metric.label}: ${metric.action}`)

  return {
    score,
    grade: getGrade(score),
    recommendations,
  }
}

export function classifyRuntimePerformancePressure(
  input: RuntimePerformancePressureInput,
): RuntimePerformancePressureSignal {
  const targetFps = Math.max(1, finiteNumber(input.targetFps, 60))
  const lowFps = Math.max(1, finiteNumber(input.lowFps, targetFps * (2 / 3)))
  const criticalFps = Math.max(1, lowFps * 0.75)
  const targetFrameTime = 1000 / targetFps
  const lowFrameTime = 1000 / lowFps
  const criticalFrameTime = 1000 / criticalFps
  const gltfCacheBytes = Math.max(
    finiteNumber(input.streaming?.gltfCacheBytes),
    finiteNumber(input.gltfCache?.loadedBytes),
  )
  const unreferencedCacheBytes = Math.max(
    finiteNumber(input.streaming?.gltfCacheUnreferencedBytes),
    finiteNumber(input.gltfCache?.unreferencedBytes),
  )
  const pendingCacheBytes = Math.max(
    finiteNumber(input.streaming?.gltfCachePendingBytes),
    finiteNumber(input.gltfCache?.pendingBytes),
  )

  const metrics: RuntimePerformancePressureMetric[] = [
    lowMetric({
      id: 'fps',
      label: 'FPS',
      value: finiteNumber(input.fps, targetFps),
      target: targetFps,
      warning: lowFps,
      critical: criticalFps,
      action: 'Lower render quality, reduce live actors, or split the scene.',
    }),
    highMetric({
      id: 'frame-time',
      label: 'Frame Time',
      value: finiteNumber(input.frameTimeMs, targetFrameTime),
      warning: lowFrameTime,
      critical: criticalFrameTime,
      formatter: value => `${value.toFixed(1)}ms`,
      action: 'Reduce render work or main-thread work per frame.',
    }),
    highMetric({
      id: 'draw-calls',
      label: 'Draw Calls',
      value: finiteNumber(input.renderInfo?.calls),
      warning: 120,
      critical: 200,
      action: 'Merge materials, instance repeated meshes, or partition actors.',
    }),
    highMetric({
      id: 'triangles',
      label: 'Triangles',
      value: finiteNumber(input.renderInfo?.triangles),
      warning: 500_000,
      critical: 1_000_000,
      action: 'Use lower LODs, simplify meshes, or chunk distant content.',
    }),
    highMetric({
      id: 'textures',
      label: 'Textures',
      value: finiteNumber(input.memory?.textures),
      warning: 80,
      critical: 140,
      action: 'Reduce texture count, atlas materials, or lower texture tiers.',
    }),
    highMetric({
      id: 'active-actors',
      label: 'Active Actors',
      value: finiteNumber(input.streaming?.activeActorCount),
      warning: 120,
      critical: 220,
      action: 'Cook world partition cells or convert distant actors to chunks.',
    }),
    highMetric({
      id: 'active-cells',
      label: 'Active Cells',
      value: finiteNumber(input.streaming?.activeCellCount),
      warning: 8,
      critical: 16,
      action: 'Reduce active radius or split dense cells more evenly.',
    }),
    highMetric({
      id: 'gltf-cache',
      label: 'GLB Cache',
      value: gltfCacheBytes,
      warning: 256 * 1024 * 1024,
      critical: 512 * 1024 * 1024,
      formatter: formatRuntimePressureBytes,
      action: 'Prefer streamed assets and evict unreferenced runtime GLBs.',
    }),
    highMetric({
      id: 'unreferenced-cache',
      label: 'Unused GLB Cache',
      value: unreferencedCacheBytes,
      warning: 96 * 1024 * 1024,
      critical: 192 * 1024 * 1024,
      formatter: formatRuntimePressureBytes,
      action: 'Let cache eviction run or reduce prefetch size.',
    }),
    highMetric({
      id: 'pending-cache',
      label: 'Pending GLB Loads',
      value: pendingCacheBytes,
      warning: 64 * 1024 * 1024,
      critical: 160 * 1024 * 1024,
      formatter: formatRuntimePressureBytes,
      action: 'Reduce required initial assets or prefetch fewer cells.',
    }),
  ]

  if (input.longTasks?.supported) {
    metrics.push(
      highMetric({
        id: 'long-task',
        label: 'Main Thread',
        value: Math.max(
          finiteNumber(input.longTasks.lastDuration),
          finiteNumber(input.longTasks.maxDuration),
        ),
        warning: 50,
        critical: 100,
        formatter: value => `${value.toFixed(1)}ms`,
        action: 'Move expensive work out of the frame loop or stage loading.',
      }),
    )
  }

  const bottlenecks = metrics
    .filter(metric => metric.level !== 'ready')
    .sort((a, b) => getMetricSortScore(b) - getMetricSortScore(a))
  const top = bottlenecks[0]
  const level = top?.level ?? 'ready'

  return {
    level,
    headline: top ? `${top.label} pressure` : 'Runtime performance stable',
    message: top
      ? `${top.label}: ${top.valueLabel} against ${top.budgetLabel}. ${top.action}`
      : 'Live renderer, streaming, and cache metrics are within pressure thresholds.',
    bottlenecks,
    metrics,
  }
}
