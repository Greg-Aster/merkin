export const NPC_LEGACY_FIREFLY_ERROR_CONDITION: string
export const LEGACY_FIREFLY_MIGRATION_CUTOFF: string
export const KNOWN_CONVERSATION_PROFILE_IDS: string[]

export type NpcValidationSeverity = 'warning' | 'error'

export interface NpcValidationOptions {
  knownConversationProfileIds?: string[]
  legacyFireflySeverity?: NpcValidationSeverity
  maxFireflyNpcCount?: number
}

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

export function normalizeConversationProfileId(value: string): string

export function isKnownConversationProfileId(
  value: string,
  knownProfileIds?: Set<string> | string[] | null,
): boolean

export function validateNpcConversationConfig(input: {
  actorId: string
  conversation: unknown
  knownProfileIds?: Set<string> | string[]
}): { errors: string[]; warnings: string[] }

export function validateNpcLevelContract(
  level: unknown,
  options?: NpcValidationOptions,
): NpcValidationResult

export function validateNpcNodes(
  nodes: unknown[],
  options?: NpcValidationOptions,
): NpcValidationResult

export function validateNpcActors(
  actors: unknown[],
  options?: NpcValidationOptions,
): NpcValidationResult
