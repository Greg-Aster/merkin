import type { Sprite } from 'three'
import type {
  NpcBehaviorConfig,
  NpcComponent,
  NpcConversationConfig,
  NpcInteractionConfig,
  NpcInteractionMode,
  NpcPresentationConfig,
  NpcStateConfig,
} from '../../engine/npcTypes'
import type { ActorDefinition } from '../../engine/types'

export type RuntimeNpcInteractionMode = NpcInteractionMode
export type RuntimeNpcInteractionSource = 'click'
export type RuntimeNpcInteractionConfig = NpcInteractionConfig
export type RuntimeNpcConversationConfig = NpcConversationConfig
export type RuntimeNpcBehaviorConfig = NpcBehaviorConfig
export type RuntimeNpcPresentationConfig = NpcPresentationConfig
export type RuntimeNpcStateConfig = NpcStateConfig
export type RuntimeNpcComponent = NpcComponent

export type RuntimeNpcActor = ActorDefinition & {
  npc?: RuntimeNpcComponent | null
}

export interface RuntimeNpcRegistration {
  levelId: string
  actorId: string
  actorName: string
  npcId: string
  archetype: string
  npc: RuntimeNpcComponent
}

export interface RuntimeNpcInteractionTarget {
  npcId: string
  sprite: Sprite
}

export interface RuntimeNpcInteractionEvent {
  type: 'npc.interaction'
  eventKey: string
  source: RuntimeNpcInteractionSource
  mode: 'click'
  levelId: string
  actorId: string
  actorName: string
  npcId: string
  archetype: string
  displayName?: string
  prompt?: string
  cooldownMs: number
  timestamp: number
  npc: RuntimeNpcComponent
}

export interface RuntimeNpcRegistrySnapshot {
  registrations: RuntimeNpcRegistration[]
  interactiveNpcIds: string[]
  disabledNpcIds: string[]
  duplicateNpcIds: string[]
  duplicateActorIds: string[]
  missingActorNpcIds: string[]
  missingNpcIdActorIds: string[]
  unsupportedInteractionModeActorIds: string[]
}

export interface RuntimeNpcDiagnostics {
  registeredCount: number
  interactiveCount: number
  disabledCount: number
  duplicateNpcIds: string[]
  duplicateActorIds: string[]
  missingActorNpcIds: string[]
  missingNpcIdActorIds: string[]
  unsupportedInteractionModeActorIds: string[]
}
