type RuntimeRenderState = {
  required: Record<string, string[]>
  rendered: Record<string, string[]>
}

declare global {
  interface Window {
    __gameRuntimeRenderState?: RuntimeRenderState
  }
}

const requiredActorsByLevel = new Map<string, Set<string>>()
const renderedActorsByLevel = new Map<string, Set<string>>()

function toRecord(source: Map<string, Set<string>>) {
  return Object.fromEntries(
    Array.from(source.entries()).map(([levelId, actors]) => [
      levelId,
      Array.from(actors).sort(),
    ]),
  )
}

function publishRuntimeRenderState() {
  if (typeof window === 'undefined') return

  window.__gameRuntimeRenderState = {
    required: toRecord(requiredActorsByLevel),
    rendered: toRecord(renderedActorsByLevel),
  }
}

export function setRequiredRuntimeRenderActors(
  levelId: string,
  actorIds: string[],
) {
  requiredActorsByLevel.set(levelId, new Set(actorIds))
  publishRuntimeRenderState()
}

export function clearRuntimeRenderedActors(levelId: string) {
  renderedActorsByLevel.delete(levelId)
  publishRuntimeRenderState()
}

export function markRuntimeActorRendered(levelId: string, actorId: string) {
  const renderedActors = renderedActorsByLevel.get(levelId) ?? new Set<string>()
  renderedActors.add(actorId)
  renderedActorsByLevel.set(levelId, renderedActors)
  publishRuntimeRenderState()
}

export function unmarkRuntimeActorRendered(levelId: string, actorId: string) {
  const renderedActors = renderedActorsByLevel.get(levelId)
  if (!renderedActors) return

  renderedActors.delete(actorId)
  publishRuntimeRenderState()
}
