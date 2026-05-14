import { writable } from 'svelte/store'
import { setRuntimeDiagnostic } from './runtimeDiagnosticsStore'

type RuntimeCollisionState = {
  loadedColliderUrls: Record<string, string[]>
}

declare global {
  interface Window {
    __gameRuntimeCollisionState?: RuntimeCollisionState
  }
}

const loadedColliderUrlsByLevel = new Map<string, Set<string>>()

export const runtimeLoadedColliderUrlsStore = writable<Record<string, string[]>>(
  {},
)

function toRecord() {
  return Object.fromEntries(
    Array.from(loadedColliderUrlsByLevel.entries()).map(([levelId, urls]) => [
      levelId,
      Array.from(urls).sort(),
    ]),
  )
}

function publishRuntimeCollisionState(levelId: string) {
  const loadedColliderUrls = toRecord()
  runtimeLoadedColliderUrlsStore.set(loadedColliderUrls)

  if (typeof window !== 'undefined') {
    window.__gameRuntimeCollisionState = { loadedColliderUrls }
  }

  const activeUrls = loadedColliderUrls[levelId] ?? []
  setRuntimeDiagnostic('runtimeCollision', {
    label: 'Runtime Collision',
    level: activeUrls.length > 0 ? 'ready' : 'idle',
    message:
      activeUrls.length > 0
        ? `${levelId}: ${activeUrls.length} runtime collider asset(s) loaded.`
        : `${levelId}: no runtime collider assets loaded.`,
    meta: {
      levelId,
      loadedColliderUrls: activeUrls,
    },
  })
}

export function markRuntimeColliderUrlLoaded(levelId: string, url: string) {
  if (!levelId || !url) return

  const loadedUrls =
    loadedColliderUrlsByLevel.get(levelId) ?? new Set<string>()
  loadedUrls.add(url)
  loadedColliderUrlsByLevel.set(levelId, loadedUrls)
  publishRuntimeCollisionState(levelId)
}

export function unmarkRuntimeColliderUrlLoaded(levelId: string, url: string) {
  const loadedUrls = loadedColliderUrlsByLevel.get(levelId)
  if (!loadedUrls || !url) return

  loadedUrls.delete(url)
  if (loadedUrls.size === 0) {
    loadedColliderUrlsByLevel.delete(levelId)
  }
  publishRuntimeCollisionState(levelId)
}

export function clearRuntimeColliderUrls(levelId: string) {
  loadedColliderUrlsByLevel.delete(levelId)
  publishRuntimeCollisionState(levelId)
}
