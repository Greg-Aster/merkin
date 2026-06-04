import {
  CANONICAL_CONVERSATION_PROFILE_IDS,
  CONVERSATION_PROFILE_ALIAS_ENTRIES,
} from '../features/conversation/characters/profileManifest.mjs'

export const LEGACY_FIREFLY_MIGRATION_CUTOFF =
  'Agent 07 legacy cleanup and certification'
export const NPC_LEGACY_FIREFLY_ERROR_CONDITION =
  'Set legacyFireflySeverity to "error" after Agent 07 migrates checked-in firefly source scenes from legacy gameplay fireflies to node.npc.'

export const SUPPORTED_NPC_ARCHETYPES = ['firefly']
export const SUPPORTED_NPC_INTERACTION_MODES = ['disabled', 'click']
export const SUPPORTED_NPC_CONVERSATION_MODES = ['none', 'read-only', 'profile']
export const SUPPORTED_NPC_BEHAVIOR_TYPES = ['static', 'hover-wander']
export const SUPPORTED_NPC_PRESENTATION_TYPES = ['firefly']

export const KNOWN_CONVERSATION_PROFILE_IDS = CANONICAL_CONVERSATION_PROFILE_IDS

const conversationProfileAliases = new Map(CONVERSATION_PROFILE_ALIAS_ENTRIES)

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isNonNegativeFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function getActorId(actor, index) {
  return isNonEmptyString(actor?.id) ? actor.id : `actor-${index}`
}

function getGameplayData(actor) {
  const gameplay = actor?.gameplay
  return isRecord(gameplay?.data) ? gameplay.data : gameplay
}

function getGameplayType(actor) {
  const gameplay = getGameplayData(actor)
  return typeof gameplay?.type === 'string' ? gameplay.type : ''
}

function getActors(level) {
  if (Array.isArray(level?.actors)) return level.actors
  if (Array.isArray(level?.nodes)) return level.nodes
  return []
}

function getLevelSettings(level) {
  return level?.settings ?? {}
}

function getMaxFireflyNpcCount(level, options) {
  if (Number.isFinite(options.maxFireflyNpcCount)) {
    return options.maxFireflyNpcCount
  }

  const budget = getLevelSettings(level)?.level?.graphicsBudget
  if (Number.isFinite(budget?.maxGameplayFireflies)) {
    return budget.maxGameplayFireflies
  }

  return Number.POSITIVE_INFINITY
}

function pushIssue(issues, actorId, field, message) {
  issues.push(`NPC actor "${actorId}" field "${field}" ${message}`)
}

export function normalizeConversationProfileId(value) {
  if (!isNonEmptyString(value)) return ''

  const lower = value.trim().toLowerCase()
  const duplicateMatch = lower.match(/^firefly_(\w+)_\1$/)
  if (duplicateMatch) {
    return normalizeConversationProfileId(`firefly_${duplicateMatch[1]}`)
  }
  if (conversationProfileAliases.has(lower)) {
    return conversationProfileAliases.get(lower)
  }
  if (lower.startsWith('firefly_')) {
    const plainName = lower.replace(/^firefly_/, '')
    return conversationProfileAliases.get(plainName) ?? plainName
  }
  return lower
}

export function isKnownConversationProfileId(value, knownProfileIds = null) {
  const profileIds =
    knownProfileIds instanceof Set
      ? knownProfileIds
      : new Set(knownProfileIds ?? KNOWN_CONVERSATION_PROFILE_IDS)
  return profileIds.has(normalizeConversationProfileId(value))
}

export function validateNpcConversationConfig({
  actorId,
  conversation,
  knownProfileIds = new Set(KNOWN_CONVERSATION_PROFILE_IDS),
}) {
  const errors = []
  const profileIds =
    knownProfileIds instanceof Set
      ? knownProfileIds
      : new Set(knownProfileIds ?? KNOWN_CONVERSATION_PROFILE_IDS)
  validateConversation({
    actorId,
    npc: { conversation },
    errors,
    knownProfileIds: profileIds,
  })
  return { errors, warnings: [] }
}

function validateInteraction({ actorId, npc, errors }) {
  const interaction = npc.interaction
  if (!isRecord(interaction)) {
    pushIssue(errors, actorId, 'npc.interaction', 'is required.')
    return
  }

  if (
    interaction.enabled !== undefined &&
    typeof interaction.enabled !== 'boolean'
  ) {
    pushIssue(errors, actorId, 'npc.interaction.enabled', 'must be a boolean.')
  }

  if (!SUPPORTED_NPC_INTERACTION_MODES.includes(interaction.mode)) {
    pushIssue(
      errors,
      actorId,
      'npc.interaction.mode',
      `unsupported mode "${String(interaction.mode ?? '')}"; supported modes are ${SUPPORTED_NPC_INTERACTION_MODES.join(', ')}.`,
    )
  }

  if (
    interaction.cooldownMs !== undefined &&
    !isNonNegativeFinite(interaction.cooldownMs)
  ) {
    pushIssue(
      errors,
      actorId,
      'npc.interaction.cooldownMs',
      'must be a non-negative finite number.',
    )
  }
}

function validateConversation({ actorId, npc, errors, knownProfileIds }) {
  const conversation = npc.conversation
  if (conversation === undefined) return

  if (!isRecord(conversation)) {
    pushIssue(errors, actorId, 'npc.conversation', 'must be an object.')
    return
  }

  if (!SUPPORTED_NPC_CONVERSATION_MODES.includes(conversation.mode)) {
    pushIssue(
      errors,
      actorId,
      'npc.conversation.mode',
      `unsupported mode "${String(conversation.mode ?? '')}"; supported modes are ${SUPPORTED_NPC_CONVERSATION_MODES.join(', ')}.`,
    )
    return
  }

  if (
    conversation.mode === 'read-only' &&
    !isNonEmptyString(conversation.body)
  ) {
    pushIssue(
      errors,
      actorId,
      'npc.conversation.body',
      'is required for read-only conversation.',
    )
  }

  if (
    conversation.mode === 'read-only' &&
    conversation.durationMs !== undefined &&
    !isPositiveFinite(conversation.durationMs)
  ) {
    pushIssue(
      errors,
      actorId,
      'npc.conversation.durationMs',
      'must be a positive finite number.',
    )
  }

  if (conversation.mode !== 'profile') return

  if (!isNonEmptyString(conversation.personalityId)) {
    pushIssue(
      errors,
      actorId,
      'npc.conversation.personalityId',
      'is required for profile conversation.',
    )
    return
  }

  const normalizedProfileId = normalizeConversationProfileId(
    conversation.personalityId,
  )
  if (!knownProfileIds.has(normalizedProfileId)) {
    pushIssue(
      errors,
      actorId,
      'npc.conversation.personalityId',
      `references unknown conversation profile "${conversation.personalityId}".`,
    )
  }

  if (conversation.fallback !== undefined) {
    if (!isRecord(conversation.fallback)) {
      pushIssue(
        errors,
        actorId,
        'npc.conversation.fallback',
        'must be an object when authored.',
      )
      return
    }

    if (!isNonEmptyString(conversation.fallback.body)) {
      pushIssue(
        errors,
        actorId,
        'npc.conversation.fallback.body',
        'is required when profile fallback is authored.',
      )
    }

    if (
      conversation.fallback.durationMs !== undefined &&
      !isPositiveFinite(conversation.fallback.durationMs)
    ) {
      pushIssue(
        errors,
        actorId,
        'npc.conversation.fallback.durationMs',
        'must be a positive finite number.',
      )
    }
  }
}

function validateBehavior({ actorId, npc, errors }) {
  const behavior = npc.behavior
  if (behavior === undefined) return

  if (!isRecord(behavior)) {
    pushIssue(errors, actorId, 'npc.behavior', 'must be an object.')
    return
  }

  if (!SUPPORTED_NPC_BEHAVIOR_TYPES.includes(behavior.type)) {
    pushIssue(
      errors,
      actorId,
      'npc.behavior.type',
      `unsupported type "${String(behavior.type ?? '')}"; supported types are ${SUPPORTED_NPC_BEHAVIOR_TYPES.join(', ')}.`,
    )
    return
  }

  if (behavior.type !== 'hover-wander') return

  for (const [field, value] of [
    ['npc.behavior.radius', behavior.radius],
    ['npc.behavior.speed', behavior.speed],
  ]) {
    if (!isPositiveFinite(value)) {
      pushIssue(errors, actorId, field, 'must be a positive finite number.')
    }
  }

  for (const [field, value] of [
    ['npc.behavior.hoverHeight', behavior.hoverHeight],
    ['npc.behavior.bobAmplitude', behavior.bobAmplitude],
    ['npc.behavior.bobSpeed', behavior.bobSpeed],
  ]) {
    if (value !== undefined && !isNonNegativeFinite(value)) {
      pushIssue(errors, actorId, field, 'must be a non-negative finite number.')
    }
  }
}

function validateFireflyPresentation({ actorId, presentation, errors }) {
  if (!isNonEmptyString(presentation.color)) {
    pushIssue(
      errors,
      actorId,
      'npc.presentation.color',
      'is required for firefly presentation.',
    )
  }

  for (const [field, rule] of [
    ['npc.presentation.size', 'positive'],
  ]) {
    const value = presentation[field.replace('npc.presentation.', '')]
    if (rule === 'positive' && !isPositiveFinite(value)) {
      pushIssue(errors, actorId, field, 'must be a positive finite number.')
    }
    if (rule === 'non-negative' && !isNonNegativeFinite(value)) {
      pushIssue(errors, actorId, field, 'must be a non-negative finite number.')
    }
  }

  for (const field of [
    'twinkleSpeed',
    'lightBurstBoost',
    'selectionLightBoost',
    'lightBurstSpriteBoost',
  ]) {
    if (
      presentation[field] !== undefined &&
      !isPositiveFinite(presentation[field])
    ) {
      pushIssue(
        errors,
        actorId,
        `npc.presentation.${field}`,
        'must be a positive finite number.',
      )
    }
  }

  if (
    presentation.shockwaveEnabled !== undefined &&
    typeof presentation.shockwaveEnabled !== 'boolean'
  ) {
    pushIssue(
      errors,
      actorId,
      'npc.presentation.shockwaveEnabled',
      'must be a boolean.',
    )
  }
}

function validatePresentation({ actorId, npc, errors }) {
  const presentation = npc.presentation
  if (!isRecord(presentation)) {
    pushIssue(errors, actorId, 'npc.presentation', 'is required.')
    return
  }

  if (!SUPPORTED_NPC_PRESENTATION_TYPES.includes(presentation.type)) {
    pushIssue(
      errors,
      actorId,
      'npc.presentation.type',
      `unsupported type "${String(presentation.type ?? '')}"; supported types are ${SUPPORTED_NPC_PRESENTATION_TYPES.join(', ')}.`,
    )
    return
  }

  if (npc.archetype === 'firefly' && presentation.type !== 'firefly') {
    pushIssue(
      errors,
      actorId,
      'npc.presentation.type',
      'must be "firefly" when npc.archetype is "firefly".',
    )
  }

  if (presentation.type === 'firefly') {
    validateFireflyPresentation({ actorId, presentation, errors })
  }
}

function validateNpcActor({
  actor,
  actorId,
  errors,
  npcIds,
  duplicateNpcIds,
  knownProfileIds,
}) {
  const npc = actor.npc
  if (!isRecord(npc)) return false

  if (!isNonEmptyString(npc.id)) {
    pushIssue(errors, actorId, 'npc.id', 'is required.')
  } else if (npcIds.has(npc.id)) {
    duplicateNpcIds.add(npc.id)
    pushIssue(
      errors,
      actorId,
      'npc.id',
      `duplicates NPC id "${npc.id}" first used by actor "${npcIds.get(npc.id)}".`,
    )
  } else {
    npcIds.set(npc.id, actorId)
  }

  if (!SUPPORTED_NPC_ARCHETYPES.includes(npc.archetype)) {
    pushIssue(
      errors,
      actorId,
      'npc.archetype',
      `unsupported archetype "${String(npc.archetype ?? '')}"; supported archetypes are ${SUPPORTED_NPC_ARCHETYPES.join(', ')}.`,
    )
  }

  validateInteraction({ actorId, npc, errors })
  validateConversation({ actorId, npc, errors, knownProfileIds })
  validateBehavior({ actorId, npc, errors })
  validatePresentation({ actorId, npc, errors })

  return true
}

export function validateNpcLevelContract(level, options = {}) {
  const errors = []
  const warnings = []
  const actors = getActors(level)
  const npcIds = new Map()
  const knownProfileIds = new Set(
    options.knownConversationProfileIds ?? KNOWN_CONVERSATION_PROFILE_IDS,
  )
  const duplicateNpcIds = new Set()
  const legacyFireflySeverity = options.legacyFireflySeverity ?? 'warning'
  const maxFireflyNpcCount = getMaxFireflyNpcCount(level, options)
  let npcActorCount = 0
  let fireflyNpcActorCount = 0
  let legacyFireflyGameplayActorCount = 0

  for (const [index, actor] of actors.entries()) {
    const actorId = getActorId(actor, index)
    if (
      validateNpcActor({
        actor,
        actorId,
        errors,
        npcIds,
        duplicateNpcIds,
        knownProfileIds,
      })
    ) {
      npcActorCount += 1
      if (actor.npc.archetype === 'firefly') fireflyNpcActorCount += 1
    }

    if (getGameplayType(actor) === 'firefly') {
      legacyFireflyGameplayActorCount += 1
      const issue = `Actor "${actorId}" field "gameplay.type" uses legacy firefly gameplay data; migrate to npc before ${LEGACY_FIREFLY_MIGRATION_CUTOFF}.`
      if (legacyFireflySeverity === 'error') errors.push(issue)
      else warnings.push(issue)
    }
  }

  if (fireflyNpcActorCount > maxFireflyNpcCount) {
    errors.push(
      `${fireflyNpcActorCount} authored firefly NPC actors exceed level budget of ${maxFireflyNpcCount}.`,
    )
  }

  return {
    errors,
    warnings,
    diagnostics: {
      npcActorCount,
      fireflyNpcActorCount,
      legacyFireflyGameplayActorCount,
      duplicateNpcIds: [...duplicateNpcIds],
      maxFireflyNpcCount,
    },
  }
}

export function validateNpcNodes(nodes, options = {}) {
  return validateNpcLevelContract({ nodes }, options)
}

export function validateNpcActors(actors, options = {}) {
  return validateNpcLevelContract({ actors }, options)
}
