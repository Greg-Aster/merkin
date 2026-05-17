import { setRuntimeDiagnostic } from '../../stores/runtimeDiagnosticsStore'
import {
  publishRuntimeNpcInteractionEvent,
  resetRuntimeNpcStores,
  setRuntimeNpcRegistrySnapshot,
} from './runtimeNpcStores'
import type {
  RuntimeNpcComponent,
  RuntimeNpcInteractionEvent,
  RuntimeNpcInteractionMode,
  RuntimeNpcInteractionSource,
  RuntimeNpcRegistration,
} from './runtimeNpcTypes'

interface RegisterRuntimeNpcActorInput {
  levelId: string
  actorId: string
  actorName: string
  npc: RuntimeNpcComponent
}

interface RuntimeNpcActorReference {
  levelId: string
  actorId: string
}

const registrationsByActorKey = new Map<string, RuntimeNpcRegistration>()
const missingActorNpcIds = new Set<string>()
const missingNpcIdActorIdsByKey = new Map<string, string>()
const unsupportedInteractionModeActorIdsByKey = new Map<string, string>()
const cooldownUntilByNpcId = new Map<string, number>()

function getActorKey(levelId: string, actorId: string) {
  return `${levelId}:${actorId}`
}

function getStableNpcId(npc: RuntimeNpcComponent) {
  return typeof npc.id === 'string' ? npc.id.trim() : ''
}

function getInteractionMode(
  npc: RuntimeNpcComponent,
): RuntimeNpcInteractionMode | 'unsupported' {
  if (npc.interaction?.enabled === false) return 'disabled'
  const mode = (npc.interaction as { mode?: unknown } | undefined)?.mode
  if (mode === 'click' || mode === 'disabled') return mode
  return 'unsupported'
}

function getCooldownMs(npc: RuntimeNpcComponent) {
  const cooldownMs = npc.interaction?.cooldownMs
  return typeof cooldownMs === 'number' && Number.isFinite(cooldownMs)
    ? Math.max(0, cooldownMs)
    : 0
}

function getEventKey(npc: RuntimeNpcComponent) {
  const eventKey = npc.interaction?.eventKey
  return typeof eventKey === 'string' && eventKey.trim()
    ? eventKey.trim()
    : 'npc.interaction'
}

function cloneNpc(npc: RuntimeNpcComponent): RuntimeNpcComponent {
  return {
    ...npc,
    interaction: { ...npc.interaction },
    conversation: npc.conversation ? { ...npc.conversation } : undefined,
    behavior: npc.behavior ? { ...npc.behavior } : undefined,
    presentation: { ...npc.presentation },
    state: npc.state ? { ...npc.state } : undefined,
  }
}

function groupRegistrationsByNpcId() {
  const grouped = new Map<string, RuntimeNpcRegistration[]>()

  for (const registration of registrationsByActorKey.values()) {
    const registrations = grouped.get(registration.npcId) ?? []
    registrations.push(registration)
    grouped.set(registration.npcId, registrations)
  }

  return grouped
}

function getCanonicalRegistration(npcId: string) {
  const registrations = groupRegistrationsByNpcId().get(npcId) ?? []
  return registrations.length === 1 ? registrations[0] : null
}

function getDuplicateNpcIds(grouped = groupRegistrationsByNpcId()) {
  return Array.from(grouped.entries())
    .filter(([, registrations]) => registrations.length > 1)
    .map(([npcId]) => npcId)
    .sort()
}

function publishRuntimeNpcSnapshot() {
  const grouped = groupRegistrationsByNpcId()
  const duplicateNpcIds = getDuplicateNpcIds(grouped)
  const duplicateNpcIdSet = new Set(duplicateNpcIds)
  const registrations = Array.from(registrationsByActorKey.values()).sort(
    (left, right) =>
      left.levelId.localeCompare(right.levelId) ||
      left.actorId.localeCompare(right.actorId),
  )
  const interactiveNpcIds: string[] = []
  const disabledNpcIds: string[] = []
  const duplicateActorIds: string[] = []

  for (const registration of registrations) {
    if (duplicateNpcIdSet.has(registration.npcId)) {
      duplicateActorIds.push(registration.actorId)
      continue
    }

    const mode = getInteractionMode(registration.npc)
    if (mode === 'click') {
      interactiveNpcIds.push(registration.npcId)
    } else if (mode === 'disabled') {
      disabledNpcIds.push(registration.npcId)
    }
  }

  const missingNpcIdActorIds = Array.from(
    missingNpcIdActorIdsByKey.values(),
  ).sort()
  const unsupportedInteractionModeActorIds = Array.from(
    unsupportedInteractionModeActorIdsByKey.values(),
  ).sort()
  const missingActorIds = Array.from(missingActorNpcIds).sort()
  const hasWarnings =
    duplicateNpcIds.length > 0 ||
    duplicateActorIds.length > 0 ||
    missingActorIds.length > 0 ||
    missingNpcIdActorIds.length > 0 ||
    unsupportedInteractionModeActorIds.length > 0

  setRuntimeNpcRegistrySnapshot({
    registrations,
    interactiveNpcIds,
    disabledNpcIds,
    duplicateNpcIds,
    duplicateActorIds: duplicateActorIds.sort(),
    missingActorNpcIds: missingActorIds,
    missingNpcIdActorIds,
    unsupportedInteractionModeActorIds,
  })

  setRuntimeDiagnostic('npc', {
    label: 'Runtime NPCs',
    level: hasWarnings ? 'warning' : 'ready',
    message: hasWarnings
      ? `Runtime NPC registry has ${registrations.length} registrations, ${interactiveNpcIds.length} click targets, and validation warnings.`
      : `Runtime NPC registry has ${registrations.length} registrations and ${interactiveNpcIds.length} click targets.`,
    meta: {
      registeredCount: registrations.length,
      interactiveCount: interactiveNpcIds.length,
      disabledCount: disabledNpcIds.length,
      duplicateNpcIds,
      duplicateActorIds,
      missingActorNpcIds: missingActorIds,
      missingNpcIdActorIds,
      unsupportedInteractionModeActorIds,
    },
  })
}

export function getRuntimeNpcInteractiveObjectId(npcId: string) {
  return `npc:${npcId}`
}

export function registerRuntimeNpcActor(input: RegisterRuntimeNpcActorInput) {
  const actorKey = getActorKey(input.levelId, input.actorId)
  const npcId = getStableNpcId(input.npc)

  registrationsByActorKey.delete(actorKey)
  missingNpcIdActorIdsByKey.delete(actorKey)
  unsupportedInteractionModeActorIdsByKey.delete(actorKey)

  if (!npcId) {
    missingNpcIdActorIdsByKey.set(actorKey, input.actorId)
    publishRuntimeNpcSnapshot()
    return
  }

  const registration: RuntimeNpcRegistration = {
    levelId: input.levelId,
    actorId: input.actorId,
    actorName: input.actorName,
    npcId,
    archetype: input.npc.archetype,
    npc: cloneNpc(input.npc),
  }

  registrationsByActorKey.set(actorKey, registration)

  if (getInteractionMode(input.npc) === 'unsupported') {
    unsupportedInteractionModeActorIdsByKey.set(actorKey, input.actorId)
  }

  publishRuntimeNpcSnapshot()
}

export function unregisterRuntimeNpcActor(reference: RuntimeNpcActorReference) {
  const actorKey = getActorKey(reference.levelId, reference.actorId)
  const registration = registrationsByActorKey.get(actorKey)

  registrationsByActorKey.delete(actorKey)
  missingNpcIdActorIdsByKey.delete(actorKey)
  unsupportedInteractionModeActorIdsByKey.delete(actorKey)

  if (registration && !getCanonicalRegistration(registration.npcId)) {
    cooldownUntilByNpcId.delete(registration.npcId)
  }

  publishRuntimeNpcSnapshot()
}

export function canBindRuntimeNpcInteraction(
  reference: RuntimeNpcActorReference & { npcId: string },
) {
  const actorKey = getActorKey(reference.levelId, reference.actorId)
  const registration = registrationsByActorKey.get(actorKey)

  if (!registration || registration.npcId !== reference.npcId) {
    missingActorNpcIds.add(reference.npcId)
    publishRuntimeNpcSnapshot()
    return false
  }

  const canonical = getCanonicalRegistration(reference.npcId)
  return (
    canonical?.actorId === reference.actorId &&
    canonical.levelId === reference.levelId &&
    getInteractionMode(canonical.npc) === 'click'
  )
}

export function recordRuntimeNpcInteraction(
  npcId: string,
  source: RuntimeNpcInteractionSource,
): RuntimeNpcInteractionEvent | null {
  const registration = getCanonicalRegistration(npcId)
  if (!registration || getInteractionMode(registration.npc) !== 'click') {
    missingActorNpcIds.add(npcId)
    publishRuntimeNpcSnapshot()
    return null
  }

  const timestamp = Date.now()
  const cooldownUntil = cooldownUntilByNpcId.get(npcId) ?? 0
  if (timestamp < cooldownUntil) {
    return null
  }

  const cooldownMs = getCooldownMs(registration.npc)
  if (cooldownMs > 0) {
    cooldownUntilByNpcId.set(npcId, timestamp + cooldownMs)
  }

  const event: RuntimeNpcInteractionEvent = {
    type: 'npc.interaction',
    eventKey: getEventKey(registration.npc),
    source,
    mode: 'click',
    levelId: registration.levelId,
    actorId: registration.actorId,
    actorName: registration.actorName,
    npcId,
    archetype: registration.archetype,
    displayName: registration.npc.displayName,
    prompt: registration.npc.interaction?.prompt,
    cooldownMs,
    timestamp,
    npc: cloneNpc(registration.npc),
  }

  publishRuntimeNpcInteractionEvent(event)
  return event
}

export function resetRuntimeNpcRegistry() {
  registrationsByActorKey.clear()
  missingActorNpcIds.clear()
  missingNpcIdActorIdsByKey.clear()
  unsupportedInteractionModeActorIdsByKey.clear()
  cooldownUntilByNpcId.clear()
  resetRuntimeNpcStores()
  publishRuntimeNpcSnapshot()
}
