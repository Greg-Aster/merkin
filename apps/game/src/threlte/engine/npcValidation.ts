import {
  KNOWN_CONVERSATION_PROFILE_IDS,
  LEGACY_FIREFLY_MIGRATION_CUTOFF,
  NPC_LEGACY_FIREFLY_ERROR_CONDITION,
  normalizeConversationProfileId as normalizeConversationProfileIdCore,
  validateNpcActors as validateNpcActorsCore,
  validateNpcLevelContract as validateNpcLevelContractCore,
  validateNpcNodes as validateNpcNodesCore,
} from './npcValidationCore.mjs'
import type { EditorSceneDocument } from './sceneDocumentTypes'
import type { ActorDefinition, LevelDefinition } from './types'

export {
  KNOWN_CONVERSATION_PROFILE_IDS,
  LEGACY_FIREFLY_MIGRATION_CUTOFF,
  NPC_LEGACY_FIREFLY_ERROR_CONDITION,
}

export type NpcValidationSeverity = 'warning' | 'error'

export interface NpcValidationDiagnostics {
  npcActorCount: number
  fireflyNpcActorCount: number
  legacyFireflyGameplayActorCount: number
  duplicateNpcIds: string[]
  maxFireflyNpcCount: number
}

export interface NpcValidationResult {
  errors: string[]
  warnings: string[]
  diagnostics: NpcValidationDiagnostics
}

export interface NpcValidationOptions {
  knownConversationProfileIds?: string[]
  legacyFireflySeverity?: NpcValidationSeverity
  maxFireflyNpcCount?: number
}

export function normalizeConversationProfileId(value: string) {
  return normalizeConversationProfileIdCore(value) as string
}

export function validateNpcLevelContract(
  level: LevelDefinition | EditorSceneDocument,
  options: NpcValidationOptions = {},
): NpcValidationResult {
  return validateNpcLevelContractCore(level, options) as NpcValidationResult
}

export function validateNpcActors(
  actors: ActorDefinition[],
  options: NpcValidationOptions = {},
): NpcValidationResult {
  return validateNpcActorsCore(actors, options) as NpcValidationResult
}

export function validateNpcNodes(
  nodes: EditorSceneDocument['nodes'],
  options: NpcValidationOptions = {},
): NpcValidationResult {
  return validateNpcNodesCore(nodes, options) as NpcValidationResult
}
