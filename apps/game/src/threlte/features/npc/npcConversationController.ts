import type { NpcComponent, NpcConversationConfig } from '../../engine/npcTypes'
import { gameActions } from '../../stores/gameStateStore'
import { characterRegistry } from '../conversation/characters'
import {
  type ConversationContext,
  type ConversationSession,
  type NPCPersonality,
  conversationActions,
} from '../conversation/runtime'
import { validateNpcConversationConfig } from './npcConversationValidation'
import { npcStateActions } from './npcStateStore'
import type { NpcConversationMode } from './npcStateStore'

export type NpcConversationStartStatus =
  | 'none'
  | 'read-only'
  | 'profile'
  | 'fallback'
  | 'invalid'
  | 'failed'

export interface NpcConversationIdentity {
  npcId: string
  actorId: string
  levelId: string
  displayName?: string
  archetype?: string
}

export interface NpcInteractionConfig {
  eventKey?: string
}

export interface StartNpcConversationInput {
  identity: NpcConversationIdentity
  conversation: NpcConversationConfig
  interaction?: NpcInteractionConfig
  context?: Partial<ConversationContext>
}

export interface StartNpcConversationFromComponentInput {
  npc: NpcComponent
  actorId: string
  levelId: string
  context?: Partial<ConversationContext>
}

export interface NpcConversationStartResult {
  status: NpcConversationStartStatus
  eventKey?: string
  session?: ConversationSession | null
  errors?: string[]
}

function getStableEventKey(
  interaction: NpcInteractionConfig | undefined,
  mode: NpcConversationMode,
) {
  void mode
  const authoredEventKey = interaction?.eventKey?.trim()
  return authoredEventKey || 'npc.interaction'
}

function getReadOnlyNpcPersonality(
  identity: NpcConversationIdentity,
): NPCPersonality {
  const displayName = identity.displayName?.trim() || identity.npcId
  return {
    id: identity.npcId,
    name: displayName,
    species: identity.archetype || 'NPC',
    personality: {
      core: `${displayName} is an authored NPC with read-only dialogue.`,
      traits: [],
      quirks: [],
      interests: [],
      fears: [],
      goals: [],
    },
    knowledge: {
      topics: {},
      memories: [],
      secrets: [],
      backstory: '',
      openingStatement: undefined,
    },
    behavior: {
      greetingStyle: 'mysterious',
      conversationStyle: 'concise',
      emotionalRange: ['peaceful', 'neutral'],
      defaultMood: 'peaceful',
      speechPatterns: [],
    },
    visual: {
      description: displayName,
      expressions: {},
      visualCues: {},
    },
    conversation: {
      farewellTriggers: [],
      topicTransitions: {},
    },
  }
}

function getConversationContext(
  input: StartNpcConversationInput,
): ConversationContext {
  return {
    location:
      input.context?.location ||
      input.identity.levelId ||
      input.identity.actorId ||
      'unknown',
    timeOfDay: input.context?.timeOfDay ?? 'night',
    playerLevel: input.context?.playerLevel ?? input.identity.levelId,
    gameState: {
      ...input.context?.gameState,
      npcId: input.identity.npcId,
      actorId: input.identity.actorId,
      levelId: input.identity.levelId,
      archetype: input.identity.archetype,
      conversationMode: input.conversation.mode,
    },
    environmentData: input.context?.environmentData,
    previousConversations: input.context?.previousConversations,
    relationshipLevel: input.context?.relationshipLevel,
  }
}

function recordNpcInteraction(
  input: StartNpcConversationInput,
  mode: NpcConversationMode,
) {
  const eventKey = getStableEventKey(input.interaction, mode)
  npcStateActions.recordInteractionEvent({
    eventKey,
    npcId: input.identity.npcId,
    actorId: input.identity.actorId,
    levelId: input.identity.levelId,
    mode,
    timestamp: Date.now(),
  })
  gameActions.recordInteraction(eventKey, input.identity.npcId)
  return eventKey
}

async function loadProfilePersonality(
  actorId: string,
  personalityId: string,
): Promise<{ personality?: NPCPersonality; errors?: string[] }> {
  const character = await characterRegistry.getCharacter(personalityId)
  if (!character) {
    return {
      errors: [
        `NPC actor "${actorId}" profile conversation references unknown personalityId "${personalityId}".`,
      ],
    }
  }

  return {
    personality: characterRegistry.convertToNPCPersonality(character),
  }
}

export async function startNpcConversation(
  input: StartNpcConversationInput,
): Promise<NpcConversationStartResult> {
  const validation = validateNpcConversationConfig({
    actorId: input.identity.actorId,
    conversation: input.conversation,
  })
  if (validation.errors.length > 0) {
    console.error('Invalid NPC conversation config:', validation.errors)
    return { status: 'invalid', errors: validation.errors }
  }

  let profilePersonality: NPCPersonality | undefined
  if (input.conversation.mode === 'profile') {
    const profileResult = await loadProfilePersonality(
      input.identity.actorId,
      input.conversation.personalityId,
    )
    if (profileResult.errors) {
      console.error('Invalid NPC profile conversation:', profileResult.errors)
      return { status: 'invalid', errors: profileResult.errors }
    }
    profilePersonality = profileResult.personality
  }

  const eventKey = recordNpcInteraction(input, input.conversation.mode)

  if (input.conversation.mode === 'none') {
    return { status: 'none', eventKey }
  }

  if (input.conversation.mode === 'read-only') {
    conversationActions.startReadOnlyConversation(
      input.identity.npcId,
      getReadOnlyNpcPersonality(input.identity),
      input.conversation.body,
      input.conversation.durationMs,
      getConversationContext(input),
    )
    return { status: 'read-only', eventKey }
  }

  if (!profilePersonality) {
    return {
      status: 'invalid',
      eventKey,
      errors: [
        `NPC actor "${input.identity.actorId}" profile conversation has no loaded personality.`,
      ],
    }
  }

  const session = await conversationActions.startConversation(
    input.identity.npcId,
    profilePersonality,
    getConversationContext(input),
  )

  if (session) {
    return { status: 'profile', eventKey, session }
  }

  if (input.conversation.fallback?.body) {
    conversationActions.startReadOnlyConversation(
      input.identity.npcId,
      getReadOnlyNpcPersonality(input.identity),
      input.conversation.fallback.body,
      input.conversation.fallback.durationMs,
      getConversationContext(input),
    )
    return { status: 'fallback', eventKey, session: null }
  }

  return {
    status: 'failed',
    eventKey,
    session: null,
    errors: [
      `NPC actor "${input.identity.actorId}" could not start profile conversation.`,
    ],
  }
}

export async function startNpcConversationFromComponent(
  input: StartNpcConversationFromComponentInput,
): Promise<NpcConversationStartResult> {
  const conversation: NpcConversationConfig = input.npc.conversation ?? {
    mode: 'none',
  }

  return startNpcConversation({
    identity: {
      npcId: input.npc.id,
      actorId: input.actorId,
      levelId: input.levelId,
      displayName: input.npc.displayName,
      archetype: input.npc.archetype,
    },
    interaction: input.npc.interaction,
    conversation,
    context: input.context,
  })
}
