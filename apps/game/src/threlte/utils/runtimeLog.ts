export function isRuntimeVerboseLoggingEnabled() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  return (
    params.get('debugLogs') === '1' ||
    window.localStorage.getItem('megameal.debugLogs') === '1'
  )
}

export function runtimeDebugLog(...args: unknown[]) {
  if (isRuntimeVerboseLoggingEnabled()) {
    console.log(...args)
  }
}
