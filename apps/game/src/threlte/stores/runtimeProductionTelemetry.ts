import type {
  MemoryInfo,
  RenderInfo,
} from '../features/performance/stores/performanceStore'

export type RuntimeProductionTelemetrySample = {
  timestamp: number
  fps: number
  frameTimeMs: number
  quality: string
  renderInfo: RenderInfo
  memory: MemoryInfo
  streaming: {
    activeCellCount: number
    activeActorCount: number
    activeRenderableActorCount: number
  }
  gltfCache: {
    entries: number
    loadedEntries: number
    referencedEntries: number
    unreferencedEntries: number
    loadedBytes: number
    pendingBytes: number
    referencedBytes: number
    unreferencedBytes: number
  }
}

declare global {
  interface Window {
    __megamealProductionTelemetry?: {
      samples: RuntimeProductionTelemetrySample[]
      getSnapshot: () => RuntimeProductionTelemetrySample[]
      clear: () => void
    }
  }
}

const maxSamples = 180
const samples: RuntimeProductionTelemetrySample[] = []

function publishProductionTelemetry() {
  if (typeof window === 'undefined') return

  window.__megamealProductionTelemetry = {
    samples,
    getSnapshot: () => samples.map(sample => ({ ...sample })),
    clear: () => {
      samples.length = 0
    },
  }
}

export function recordRuntimeProductionTelemetry(
  sample: RuntimeProductionTelemetrySample,
) {
  samples.push(sample)
  if (samples.length > maxSamples) {
    samples.splice(0, samples.length - maxSamples)
  }
  publishProductionTelemetry()
}
