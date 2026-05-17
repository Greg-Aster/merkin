import type { ActorDefinition } from '../engine/types'
import { setRuntimeDiagnostic } from './runtimeDiagnosticsStore'

type RuntimeActorRenderKind =
  | 'asset'
  | 'prefab'
  | 'primitive'
  | 'light'
  | 'none'

export type RuntimeRenderLifecyclePhase =
  | 'idle'
  | 'manifest-loading'
  | 'manifest-ready'
  | 'assets-preloading'
  | 'assets-ready'
  | 'scene-graph-ready'
  | 'lighting-profile-ready'
  | 'post-processing-ready'
  | 'diagnostics-ready'
  | 'player-activation-ready'
  | 'error'

type RuntimeRenderLifecycleRecord = {
  levelId: string
  phase: RuntimeRenderLifecyclePhase
  updatedAt: number
  message?: string
  detail?: Record<string, unknown>
}

type RuntimeRenderProfileDiagnosticRecord = {
  profileId: string
  tier: string
  shadowsEnabled: boolean
  maxShadowCastingLights: number
  shadowMapSize: number
  reflectionMode: string
}

type RuntimePostProcessingDiagnosticRecord = {
  enabled: boolean
  profileId?: string
  atmosphereId?: string
  passes: string[]
  ambientOcclusionEnabled?: boolean
  depthFogEnabled?: boolean
  bloomEnabled?: boolean
  colorGradingEnabled?: boolean
  kuwaharaEnabled?: boolean
  kuwaharaRadius?: number
  kuwaharaMix?: number
  kuwaharaResolutionScale?: number
  depthFogReason?: string
  bloomReason?: string
  colorGradingReason?: string
  kuwaharaReason?: string
  reason?: string
}

type RuntimeActorRenderRecord = {
  id: string
  name: string
  kind: string
  parentId: string | null
  renderKind: RuntimeActorRenderKind
  visible: boolean
  url?: string
}

type RuntimeRenderAuditSummary = {
  levelId: string
  authoredActorCount: number
  authoredRenderableActorCount: number
  activeActorCount: number
  activeRenderableActorCount: number
  mountedActorCount: number
  renderedActorCount: number
  assetActorCount: number
  loadedAssetActorCount: number
  requiredActorCount: number
  requiredRenderedActorCount: number
  lifecyclePhase: RuntimeRenderLifecyclePhase
  activeRenderProfile?: RuntimeRenderProfileDiagnosticRecord
  postProcessing?: RuntimePostProcessingDiagnosticRecord
  partitionInactiveRenderableActors: RuntimeActorRenderRecord[]
  missingMountedActors: RuntimeActorRenderRecord[]
  missingRenderedActors: RuntimeActorRenderRecord[]
  missingLoadedAssetActors: RuntimeActorRenderRecord[]
  missingRequiredRenderedActors: RuntimeActorRenderRecord[]
}

type RuntimeRenderState = {
  authored: Record<string, RuntimeActorRenderRecord[]>
  required: Record<string, string[]>
  active: Record<string, string[]>
  mounted: Record<string, string[]>
  rendered: Record<string, string[]>
  loadedAssets: Record<string, string[]>
  lifecycle: Record<string, RuntimeRenderLifecycleRecord>
  renderProfiles: Record<string, RuntimeRenderProfileDiagnosticRecord>
  postProcessing: Record<string, RuntimePostProcessingDiagnosticRecord>
  summaries: Record<string, RuntimeRenderAuditSummary>
}

declare global {
  interface Window {
    __gameRuntimeRenderState?: RuntimeRenderState
  }
}

const requiredActorsByLevel = new Map<string, Set<string>>()
const authoredActorsByLevel = new Map<
  string,
  Map<string, RuntimeActorRenderRecord>
>()
const activeActorsByLevel = new Map<string, Set<string>>()
const mountedActorsByLevel = new Map<string, Set<string>>()
const renderedActorsByLevel = new Map<string, Set<string>>()
const loadedAssetActorsByLevel = new Map<string, Set<string>>()
const lifecycleByLevel = new Map<string, RuntimeRenderLifecycleRecord>()
const renderProfileByLevel = new Map<
  string,
  RuntimeRenderProfileDiagnosticRecord
>()
const postProcessingByLevel = new Map<
  string,
  RuntimePostProcessingDiagnosticRecord
>()

const READY_PHASES = new Set<RuntimeRenderLifecyclePhase>([
  'post-processing-ready',
  'diagnostics-ready',
  'player-activation-ready',
])
const PHASE_ORDER: Record<RuntimeRenderLifecyclePhase, number> = {
  idle: 0,
  'manifest-loading': 1,
  'manifest-ready': 2,
  'assets-preloading': 3,
  'assets-ready': 4,
  'scene-graph-ready': 5,
  'lighting-profile-ready': 6,
  'post-processing-ready': 7,
  'diagnostics-ready': 8,
  'player-activation-ready': 9,
  error: 10,
}

function toRecord(source: Map<string, Set<string>>) {
  return Object.fromEntries(
    Array.from(source.entries()).map(([levelId, actors]) => [
      levelId,
      Array.from(actors).sort(),
    ]),
  )
}

function mapToRecord<T>(source: Map<string, T>) {
  return Object.fromEntries(source.entries())
}

function authoredToRecord() {
  return Object.fromEntries(
    Array.from(authoredActorsByLevel.entries()).map(([levelId, actors]) => [
      levelId,
      Array.from(actors.values()).sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    ]),
  )
}

function getActorRenderKind(actor: ActorDefinition): RuntimeActorRenderKind {
  if (actor.render?.asset?.url) return 'asset'
  if (actor.render?.prefab) return 'prefab'
  if (actor.render?.primitive) return 'primitive'
  if (actor.light) return 'light'
  return 'none'
}

function toActorRenderRecord(actor: ActorDefinition): RuntimeActorRenderRecord {
  return {
    id: actor.id,
    name: actor.name,
    kind: actor.kind,
    parentId: actor.parentId ?? null,
    renderKind: getActorRenderKind(actor),
    visible: actor.render?.visible !== false,
    url: actor.render?.asset?.url,
  }
}

function summarizeLevelRenderAudit(levelId: string): RuntimeRenderAuditSummary {
  const authoredActors = authoredActorsByLevel.get(levelId) ?? new Map()
  const authoredActorList = Array.from(authoredActors.values())
  const renderableActors = authoredActorList.filter(
    actor => actor.visible && actor.renderKind !== 'none',
  )
  const activeActors = activeActorsByLevel.get(levelId)
  const isActiveActor = (actor: RuntimeActorRenderRecord) =>
    !activeActors || activeActors.has(actor.id)
  const activeRenderableActors = renderableActors.filter(isActiveActor)
  const partitionInactiveRenderableActors = activeActors
    ? renderableActors.filter(actor => !activeActors.has(actor.id))
    : []
  const assetActors = renderableActors.filter(
    actor => actor.renderKind === 'asset',
  )
  const mountedActors = mountedActorsByLevel.get(levelId) ?? new Set<string>()
  const renderedActors = renderedActorsByLevel.get(levelId) ?? new Set<string>()
  const loadedAssetActors =
    loadedAssetActorsByLevel.get(levelId) ?? new Set<string>()
  const requiredActors = requiredActorsByLevel.get(levelId) ?? new Set<string>()
  const lifecycle = lifecycleByLevel.get(levelId)
  const missingMountedActors = authoredActorList.filter(
    actor => isActiveActor(actor) && !mountedActors.has(actor.id),
  )
  const missingRenderedActors = activeRenderableActors.filter(
    actor => !renderedActors.has(actor.id),
  )
  const missingLoadedAssetActors = assetActors.filter(
    actor => isActiveActor(actor) && !loadedAssetActors.has(actor.id),
  )
  const missingRequiredRenderedActors = Array.from(requiredActors)
    .map(actorId => authoredActors.get(actorId))
    .filter(
      (actor): actor is RuntimeActorRenderRecord =>
        Boolean(actor) && !renderedActors.has(actor.id),
    )

  return {
    levelId,
    authoredActorCount: authoredActorList.length,
    authoredRenderableActorCount: renderableActors.length,
    activeActorCount: activeActors?.size ?? authoredActorList.length,
    activeRenderableActorCount: activeRenderableActors.length,
    mountedActorCount: mountedActors.size,
    renderedActorCount: renderedActors.size,
    assetActorCount: assetActors.length,
    loadedAssetActorCount: loadedAssetActors.size,
    requiredActorCount: requiredActors.size,
    requiredRenderedActorCount: Array.from(requiredActors).filter(actorId =>
      renderedActors.has(actorId),
    ).length,
    lifecyclePhase: lifecycle?.phase ?? 'idle',
    activeRenderProfile: renderProfileByLevel.get(levelId),
    postProcessing: postProcessingByLevel.get(levelId),
    partitionInactiveRenderableActors,
    missingMountedActors,
    missingRenderedActors,
    missingLoadedAssetActors,
    missingRequiredRenderedActors,
  }
}

function summariesToRecord() {
  return Object.fromEntries(
    Array.from(authoredActorsByLevel.keys()).map(levelId => [
      levelId,
      summarizeLevelRenderAudit(levelId),
    ]),
  )
}

function publishRuntimeRenderState() {
  if (typeof window === 'undefined') return

  window.__gameRuntimeRenderState = {
    authored: authoredToRecord(),
    required: toRecord(requiredActorsByLevel),
    active: toRecord(activeActorsByLevel),
    mounted: toRecord(mountedActorsByLevel),
    rendered: toRecord(renderedActorsByLevel),
    loadedAssets: toRecord(loadedAssetActorsByLevel),
    lifecycle: mapToRecord(lifecycleByLevel),
    renderProfiles: mapToRecord(renderProfileByLevel),
    postProcessing: mapToRecord(postProcessingByLevel),
    summaries: summariesToRecord(),
  }
}

function publishRuntimeRenderAudit() {
  publishRuntimeRenderState()

  const summaries = summariesToRecord()
  const activeSummary = Object.values(summaries).sort((left, right) => {
    const leftUpdated = lifecycleByLevel.get(left.levelId)?.updatedAt ?? 0
    const rightUpdated = lifecycleByLevel.get(right.levelId)?.updatedAt ?? 0
    return rightUpdated - leftUpdated
  })[0]
  if (!activeSummary) return

  const missingRequired = activeSummary.missingRequiredRenderedActors.length
  const phase = activeSummary.lifecyclePhase
  const phaseReady = READY_PHASES.has(phase)
  const level =
    phase === 'error'
      ? 'error'
      : phaseReady && missingRequired > 0
        ? 'error'
        : phaseReady
          ? 'ready'
          : 'loading'

  setRuntimeDiagnostic('runtimeRender', {
    label: 'Runtime Render',
    level,
    message:
      level === 'error'
        ? `${activeSummary.levelId}: render phase ${phase} has ${missingRequired} missing required actor(s).`
        : `${activeSummary.levelId}: render phase ${phase}, ${activeSummary.renderedActorCount}/${activeSummary.activeRenderableActorCount} active renderable actor(s) drawn.`,
    meta: activeSummary as unknown as Record<string, unknown>,
  })
}

export function setRuntimeRenderLifecyclePhase({
  levelId,
  phase,
  message,
  detail,
}: {
  levelId: string
  phase: RuntimeRenderLifecyclePhase
  message?: string
  detail?: Record<string, unknown>
}) {
  const current = lifecycleByLevel.get(levelId)
  if (
    current &&
    phase !== 'error' &&
    PHASE_ORDER[phase] < PHASE_ORDER[current.phase]
  ) {
    return
  }

  lifecycleByLevel.set(levelId, {
    levelId,
    phase,
    message,
    detail,
    updatedAt: Date.now(),
  })
  publishRuntimeRenderAudit()
}

export function setRuntimeRenderProfileDiagnostics(
  levelId: string,
  profile: RuntimeRenderProfileDiagnosticRecord,
) {
  renderProfileByLevel.set(levelId, profile)
  publishRuntimeRenderAudit()
}

export function setRuntimePostProcessingDiagnostics(
  levelId: string,
  postProcessing: RuntimePostProcessingDiagnosticRecord,
) {
  postProcessingByLevel.set(levelId, postProcessing)
  publishRuntimeRenderAudit()
}

export function setRuntimeLevelActors(
  levelId: string,
  actors: ActorDefinition[],
) {
  authoredActorsByLevel.set(
    levelId,
    new Map(actors.map(actor => [actor.id, toActorRenderRecord(actor)])),
  )
  mountedActorsByLevel.delete(levelId)
  renderedActorsByLevel.delete(levelId)
  loadedAssetActorsByLevel.delete(levelId)
  activeActorsByLevel.delete(levelId)
  postProcessingByLevel.delete(levelId)
  publishRuntimeRenderAudit()
}

export function setRuntimeActiveActors(levelId: string, actorIds: string[]) {
  activeActorsByLevel.set(levelId, new Set(actorIds))
  publishRuntimeRenderAudit()
}

export function setRequiredRuntimeRenderActors(
  levelId: string,
  actorIds: string[],
) {
  requiredActorsByLevel.set(levelId, new Set(actorIds))
  publishRuntimeRenderAudit()
}

export function clearRuntimeRenderedActors(levelId: string) {
  mountedActorsByLevel.delete(levelId)
  renderedActorsByLevel.delete(levelId)
  loadedAssetActorsByLevel.delete(levelId)
  postProcessingByLevel.delete(levelId)
  publishRuntimeRenderAudit()
}

export function markRuntimeActorMounted(levelId: string, actorId: string) {
  const mountedActors = mountedActorsByLevel.get(levelId) ?? new Set<string>()
  mountedActors.add(actorId)
  mountedActorsByLevel.set(levelId, mountedActors)
  publishRuntimeRenderAudit()
}

export function unmarkRuntimeActorMounted(levelId: string, actorId: string) {
  const mountedActors = mountedActorsByLevel.get(levelId)
  if (!mountedActors) return

  mountedActors.delete(actorId)
  publishRuntimeRenderAudit()
}

export function markRuntimeActorRendered(levelId: string, actorId: string) {
  const renderedActors = renderedActorsByLevel.get(levelId) ?? new Set<string>()
  renderedActors.add(actorId)
  renderedActorsByLevel.set(levelId, renderedActors)
  publishRuntimeRenderAudit()
}

export function unmarkRuntimeActorRendered(levelId: string, actorId: string) {
  const renderedActors = renderedActorsByLevel.get(levelId)
  if (!renderedActors) return

  renderedActors.delete(actorId)
  publishRuntimeRenderAudit()
}

export function markRuntimeAssetActorLoaded(levelId: string, actorId: string) {
  const loadedAssetActors =
    loadedAssetActorsByLevel.get(levelId) ?? new Set<string>()
  loadedAssetActors.add(actorId)
  loadedAssetActorsByLevel.set(levelId, loadedAssetActors)
  publishRuntimeRenderAudit()
}

export function unmarkRuntimeAssetActorLoaded(
  levelId: string,
  actorId: string,
) {
  const loadedAssetActors = loadedAssetActorsByLevel.get(levelId)
  if (!loadedAssetActors) return

  loadedAssetActors.delete(actorId)
  publishRuntimeRenderAudit()
}
