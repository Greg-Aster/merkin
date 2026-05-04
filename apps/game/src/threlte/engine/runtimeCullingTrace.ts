export interface RuntimeCullingTraceEvent {
  levelId?: string
  actorId?: string
  actorName?: string
  actorKind?: string
  url?: string
  reason:
    | 'world-partition'
    | 'distance-budget'
    | 'hero-prop-budget'
    | 'required-asset-preload'
    | 'level-render-gate'
  culled: boolean
  detail?: Record<string, unknown>
}

type RuntimeCullingTraceWindow = Window & {
  __megamealCullTrace?: RuntimeCullingTraceEvent[]
}

const traceLimit = 500
const lastTraceState = new Map<string, string>()

function getTraceWindow() {
  return typeof window === 'undefined'
    ? null
    : (window as RuntimeCullingTraceWindow)
}

export function isRuntimeCullingTraceEnabled() {
  if (!import.meta.env.DEV) return false

  const traceWindow = getTraceWindow()
  if (!traceWindow) return false

  const params = new URLSearchParams(traceWindow.location.search)
  return (
    params.get('traceCulling') === '1' ||
    traceWindow.localStorage.getItem('megameal.traceCulling') === '1'
  )
}

export function traceRuntimeCulling(event: RuntimeCullingTraceEvent) {
  if (!isRuntimeCullingTraceEnabled()) return

  const traceWindow = getTraceWindow()
  if (!traceWindow) return

  const key = [
    event.levelId ?? '',
    event.actorId ?? event.url ?? '',
    event.reason,
  ].join(':')
  const state = JSON.stringify({
    culled: event.culled,
    detail: event.detail ?? null,
  })

  if (lastTraceState.get(key) === state) return
  lastTraceState.set(key, state)

  const entries = traceWindow.__megamealCullTrace ?? []
  entries.push(event)
  if (entries.length > traceLimit) entries.splice(0, entries.length - traceLimit)
  traceWindow.__megamealCullTrace = entries

  console.info(
    event.culled ? 'RuntimeCullTrace: culled' : 'RuntimeCullTrace: visible',
    event,
  )
}
