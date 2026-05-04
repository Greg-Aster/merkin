import type { ActorDefinition } from '../engine/types'

type RuntimeActorRenderKind = 'asset' | 'prefab' | 'primitive' | 'light' | 'none'

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
  summaries: Record<string, RuntimeRenderAuditSummary>
}

declare global {
  interface Window {
    __gameRuntimeRenderState?: RuntimeRenderState
  }
}

const requiredActorsByLevel = new Map<string, Set<string>>()
const authoredActorsByLevel = new Map<string, Map<string, RuntimeActorRenderRecord>>()
const activeActorsByLevel = new Map<string, Set<string>>()
const mountedActorsByLevel = new Map<string, Set<string>>()
const renderedActorsByLevel = new Map<string, Set<string>>()
const loadedAssetActorsByLevel = new Map<string, Set<string>>()

function toRecord(source: Map<string, Set<string>>) {
  return Object.fromEntries(
    Array.from(source.entries()).map(([levelId, actors]) => [
      levelId,
      Array.from(actors).sort(),
    ]),
  )
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
    summaries: summariesToRecord(),
  }
}

function publishRuntimeRenderAudit() {
  publishRuntimeRenderState()
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

export function unmarkRuntimeAssetActorLoaded(levelId: string, actorId: string) {
  const loadedAssetActors = loadedAssetActorsByLevel.get(levelId)
  if (!loadedAssetActors) return

  loadedAssetActors.delete(actorId)
  publishRuntimeRenderAudit()
}
