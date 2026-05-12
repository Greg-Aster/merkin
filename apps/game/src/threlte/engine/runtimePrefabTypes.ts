export type RuntimePrefabType =
  | 'anomaly-cluster'
  | 'command-console'
  | 'command-fin'
  | 'hanging-light'
  | 'portal-apparatus'
  | 'courtyard-fountain'
  | 'observation-rig'
  | 'bench-growth'
  | 'growth-planter'
  | 'support-column'
  | 'interior-archway'
  | 'courtyard-pylon'
  | 'story-marker'
  | 'wasteland-archway'
  | 'wasteland-monolith'
  | 'broken-ring'

export interface RuntimePrefabData {
  type: string
  variant?: string
}

export interface RuntimePrefabLoopChannel {
  speed: number
  base?: number
  amplitude?: number
  phase?: number
}

export interface RuntimePrefabAxisLoopChannels {
  x?: RuntimePrefabLoopChannel
  y?: RuntimePrefabLoopChannel
  z?: RuntimePrefabLoopChannel
}

export interface RuntimePrefabScaleLoopChannels
  extends RuntimePrefabAxisLoopChannels {
  uniform?: RuntimePrefabLoopChannel
}

export interface RuntimePrefabAssetAnimationNodeTarget {
  name: string
  rotation?: RuntimePrefabAxisLoopChannels
  position?: RuntimePrefabAxisLoopChannels
  scale?: RuntimePrefabScaleLoopChannels
}

export interface RuntimePrefabAssetAnimationContract {
  mode: 'root-loop-transform' | 'node-loop-transform'
  status: 'runtime-animation-descriptor'
  reason: string
  animationChannels: string[]
  root?: {
    rotationY?: {
      speed: number
    }
    scale?: {
      base: number
      amplitude: number
      speed: number
    }
    positionY?: {
      amplitude: number
      speed: number
    }
  }
  nodes?: RuntimePrefabAssetAnimationNodeTarget[]
}

export interface RuntimePrefabVfxTarget {
  name: string
  material?: {
    opacity?: RuntimePrefabLoopChannel
    emissiveIntensity?: RuntimePrefabLoopChannel
  }
  transform?: {
    rotation?: RuntimePrefabAxisLoopChannels
    position?: RuntimePrefabAxisLoopChannels
    scale?: RuntimePrefabScaleLoopChannels
  }
  visibility?: RuntimePrefabLoopChannel
}

export interface RuntimePrefabVfxContract {
  status: 'runtime-vfx-descriptor'
  reason: string
  targets: RuntimePrefabVfxTarget[]
}

export type RuntimePrefabDescriptor =
  | {
      kind: 'asset'
      type: RuntimePrefabType
      assetUrl: string
      assetAnimation: RuntimePrefabAssetAnimationContract | null
      assetVfx: RuntimePrefabVfxContract | null
      known: true
    }
  | {
      kind: 'empty'
      type: string
      known: false
    }
