import { type Readable, writable } from 'svelte/store'
import { MessageType, type SystemRegistry } from '../../core/LevelSystem'

export type RuntimeLightEmitterKind = 'ambient' | 'point'

export interface RuntimeLightingEnvironment {
  ambientIntensity: number
  hemisphereIntensity: number
  keyLightIntensity: number
  fillLightIntensity: number
  ambientColor: string
  skyColor: string
  groundColor: string
  keyLightColor: string
  fillLightColor: string
  keyLightPosition: [number, number, number]
  fillLightPosition: [number, number, number]
  shadows: {
    enabled: boolean
    maxCastingLights: number
    mapSize: number
    cameraSize: number
    cameraFar: number
  }
  renderProfileId: string
  renderProfileTier: string
}

export interface RuntimeLightEmitter {
  id: string
  ownerId: string
  kind: RuntimeLightEmitterKind
  color: string
  intensity: number
  position?: [number, number, number]
  distance?: number
  decay?: number
  runtimeBudgeted?: boolean
  enabled?: boolean
}

export interface RuntimeLightingSnapshot {
  environment: RuntimeLightingEnvironment
  emitters: RuntimeLightEmitter[]
  ambient: {
    color: string
    intensity: number
  }
  directional: Array<{
    position: [number, number, number]
    color: string
    intensity: number
    castShadow: boolean
  }>
  point: Array<{
    id: string
    position: [number, number, number]
    color: string
    intensity: number
    distance: number
    decay: number
  }>
}

export const DEFAULT_RUNTIME_LIGHTING_ENVIRONMENT: RuntimeLightingEnvironment =
  {
    ambientIntensity: 1.25,
    hemisphereIntensity: 0.38,
    keyLightIntensity: 0.65,
    fillLightIntensity: 0.2,
    ambientColor: '#cfe4ff',
    skyColor: '#dbe9ff',
    groundColor: '#1b2130',
    keyLightColor: '#d7e6ff',
    fillLightColor: '#50688f',
    keyLightPosition: [14, 20, -10],
    fillLightPosition: [-16, 10, 18],
    shadows: {
      enabled: true,
      maxCastingLights: 1,
      mapSize: 1024,
      cameraSize: 48,
      cameraFar: 90,
    },
    renderProfileId: 'runtime-default',
    renderProfileTier: 'desktop',
  }

function cloneEnvironment(
  environment: RuntimeLightingEnvironment,
): RuntimeLightingEnvironment {
  return {
    ...environment,
    keyLightPosition: [...environment.keyLightPosition],
    fillLightPosition: [...environment.fillLightPosition],
    shadows: { ...environment.shadows },
  }
}

function cloneEmitter(emitter: RuntimeLightEmitter): RuntimeLightEmitter {
  return {
    ...emitter,
    position: emitter.position ? [...emitter.position] : undefined,
  }
}

function buildSnapshot(
  environment: RuntimeLightingEnvironment,
  emitters: RuntimeLightEmitter[],
): RuntimeLightingSnapshot {
  const enabledEmitters = emitters.filter(emitter => emitter.enabled !== false)
  return {
    environment: cloneEnvironment(environment),
    emitters: enabledEmitters.map(cloneEmitter),
    ambient: {
      color: environment.ambientColor,
      intensity: environment.ambientIntensity,
    },
    directional: [
      {
        position: [...environment.keyLightPosition],
        color: environment.keyLightColor,
        intensity: environment.keyLightIntensity,
        castShadow:
          environment.shadows.enabled &&
          environment.shadows.maxCastingLights > 0,
      },
      {
        position: [...environment.fillLightPosition],
        color: environment.fillLightColor,
        intensity: environment.fillLightIntensity,
        castShadow: false,
      },
    ],
    point: enabledEmitters
      .filter(
        (
          emitter,
        ): emitter is RuntimeLightEmitter & {
          position: [number, number, number]
        } => emitter.kind === 'point' && Boolean(emitter.position),
      )
      .map(emitter => ({
        id: emitter.id,
        position: [...emitter.position],
        color: emitter.color,
        intensity: emitter.intensity,
        distance: emitter.distance ?? 0,
        decay: emitter.decay ?? 2,
      })),
  }
}

export class RuntimeLightingController {
  private environmentOwnerId: string | null = null
  private environment = cloneEnvironment(DEFAULT_RUNTIME_LIGHTING_ENVIRONMENT)
  private emitters = new Map<string, RuntimeLightEmitter>()
  private publishFrameId: number | null = null
  private readonly snapshotStore = writable(
    buildSnapshot(this.environment, Array.from(this.emitters.values())),
  )

  constructor(private readonly registry?: SystemRegistry) {}

  subscribe(callback: (snapshot: RuntimeLightingSnapshot) => void) {
    return this.snapshotStore.subscribe(callback)
  }

  asReadable(): Readable<RuntimeLightingSnapshot> {
    return this.snapshotStore
  }

  setEnvironment(ownerId: string, environment: RuntimeLightingEnvironment) {
    this.environmentOwnerId = ownerId
    this.environment = cloneEnvironment(environment)
    this.schedulePublish()
  }

  clearEnvironment(ownerId: string) {
    if (this.environmentOwnerId !== ownerId) return
    this.environmentOwnerId = null
    this.environment = cloneEnvironment(DEFAULT_RUNTIME_LIGHTING_ENVIRONMENT)
    this.schedulePublish()
  }

  upsertEmitter(emitter: RuntimeLightEmitter) {
    this.emitters.set(emitter.id, cloneEmitter(emitter))
    this.schedulePublish()
  }

  removeEmitter(id: string) {
    if (!this.emitters.delete(id)) return
    this.schedulePublish()
  }

  reset() {
    this.environmentOwnerId = null
    this.environment = cloneEnvironment(DEFAULT_RUNTIME_LIGHTING_ENVIRONMENT)
    this.emitters.clear()
    this.publishNow()
  }

  dispose() {
    if (this.publishFrameId !== null) {
      cancelAnimationFrame(this.publishFrameId)
      this.publishFrameId = null
    }
    this.reset()
  }

  private schedulePublish() {
    if (this.publishFrameId !== null) return
    if (typeof requestAnimationFrame !== 'function') {
      this.publishNow()
      return
    }

    this.publishFrameId = requestAnimationFrame(() => {
      this.publishFrameId = null
      this.publishNow()
    })
  }

  private publishNow() {
    const snapshot = buildSnapshot(
      this.environment,
      Array.from(this.emitters.values()),
    )
    this.snapshotStore.set(snapshot)
    this.registry?.sendMessage({
      type: MessageType.LIGHTING_UPDATE,
      source: 'runtime-lighting-controller',
      data: snapshot,
      timestamp: Date.now(),
      priority: 'normal',
    })
  }
}

export const RUNTIME_LIGHTING_CONTEXT = 'runtimeLighting'
