export {}

declare global {
  interface Window {
    bannerManager?: unknown
    timelineControllers?: Record<string, unknown>
  }
}
