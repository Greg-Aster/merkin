import type { Vec3 } from './types'

export type RuntimeGameplayType =
  | 'portal'
  | 'note'
  | 'firefly'
  | 'audio-region'
  | 'fog-volume'
  | 'mist-region'

export interface RuntimeGameplayData extends Record<string, unknown> {
  type: RuntimeGameplayType
  markerColor?: string
  markerSize?: number
  wanderEnabled?: boolean
  wanderRadius?: number
  wanderSpeed?: number
  hoverHeight?: number
  bobAmplitude?: number
  bobSpeed?: number
  twinkleSpeed?: number
  lightIntensity?: number
  lightDistance?: number
  lightDecay?: number
  spriteIntensity?: number
  lightBurstBoost?: number
  targetLevelId?: string
  title?: string
  author?: string
  location?: string
  excerpt?: string
  body?: string
  audioTrack?: string
  audioVolume?: number
  regionFalloff?: number
  fogDensity?: number
  fogColor?: string
  mistColor?: string
  mistOpacity?: number
  mistLayers?: number
  mistSpacing?: number
  mistScale?: number
  mistDriftSpeed?: number
}

export interface RuntimeGameplayRenderNode {
  id: string
  name: string
  scale: Vec3
  gameplay?: RuntimeGameplayData
}
