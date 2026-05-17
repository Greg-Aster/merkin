export type NpcArchetype = 'firefly'

export type NpcInteractionMode = 'disabled' | 'click'

export interface NpcInteractionConfig {
  enabled?: boolean
  mode: NpcInteractionMode
  prompt?: string
  cooldownMs?: number
  eventKey?: string
}

export type NpcConversationConfig =
  | {
      mode: 'none'
    }
  | {
      mode: 'read-only'
      title?: string
      excerpt?: string
      body: string
      durationMs?: number
    }
  | {
      mode: 'profile'
      personalityId: string
      fallback?: {
        body: string
        durationMs?: number
      }
    }

export type NpcBehaviorConfig =
  | {
      type: 'static'
    }
  | {
      type: 'hover-wander'
      radius: number
      speed: number
      hoverHeight?: number
      bobAmplitude?: number
      bobSpeed?: number
    }

export interface NpcFireflyPresentationConfig {
  type: 'firefly'
  color: string
  secondaryColor?: string
  size: number
  spriteIntensity: number
  lightIntensity: number
  lightDistance: number
  lightDecay: number
  twinkleSpeed?: number
  lightBurstBoost?: number
  selectionLightBoost?: number
  lightBurstSpriteBoost?: number
  lightBudgeted?: boolean
  shockwaveEnabled?: boolean
}

export type NpcPresentationConfig = NpcFireflyPresentationConfig

export interface NpcStateConfig {
  key?: string
  saveKey?: string
}

export interface NpcComponent {
  id: string
  archetype: NpcArchetype
  displayName?: string
  interaction: NpcInteractionConfig
  conversation?: NpcConversationConfig
  behavior?: NpcBehaviorConfig
  presentation: NpcPresentationConfig
  state?: NpcStateConfig
}

export type RuntimeNpcComponent = NpcComponent
