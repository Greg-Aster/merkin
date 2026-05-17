import { CANONICAL_CONVERSATION_PROFILE_IDS } from '../features/conversation/characters/profileManifest.mjs'
import type { EditorNpcData } from './editorTypes'

export const EDITOR_NPC_ARCHETYPE_OPTIONS = [
  { value: 'firefly', label: 'Firefly' },
] as const

export const EDITOR_NPC_INTERACTION_MODE_OPTIONS = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'click', label: 'Click' },
] as const

export const EDITOR_NPC_CONVERSATION_MODE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'read-only', label: 'Read-only' },
  { value: 'profile', label: 'Conversation Profile' },
] as const

export const EDITOR_NPC_BEHAVIOR_TYPE_OPTIONS = [
  { value: 'static', label: 'Static' },
  { value: 'hover-wander', label: 'Hover Wander' },
] as const

export const EDITOR_NPC_PERSONALITY_OPTIONS = [
  ...CANONICAL_CONVERSATION_PROFILE_IDS,
].sort()

export type EditorNpcPatch =
  | {
      scope: 'identity'
      field: 'id' | 'displayName' | 'archetype'
      value: string
    }
  | {
      scope: 'interaction'
      field: 'mode' | 'prompt'
      value: string
    }
  | {
      scope: 'conversationMode'
      value: 'none' | 'read-only' | 'profile'
    }
  | {
      scope: 'conversationText'
      field: 'title' | 'excerpt' | 'body' | 'personalityId'
      value: string
    }
  | {
      scope: 'conversationNumber'
      field: 'durationMs'
      value: string
    }
  | {
      scope: 'behaviorMode'
      value: 'static' | 'hover-wander'
    }
  | {
      scope: 'behaviorNumber'
      field: 'radius' | 'speed' | 'hoverHeight' | 'bobAmplitude' | 'bobSpeed'
      value: string
    }
  | {
      scope: 'presentationText'
      field: 'color' | 'secondaryColor'
      value: string
    }
  | {
      scope: 'presentationNumber'
      field:
        | 'size'
        | 'spriteIntensity'
        | 'lightIntensity'
        | 'lightDistance'
        | 'lightDecay'
        | 'twinkleSpeed'
        | 'lightBurstBoost'
        | 'selectionLightBoost'
        | 'lightBurstSpriteBoost'
      value: string
    }
  | {
      scope: 'presentationBoolean'
      field: 'shockwaveEnabled'
      value: boolean
    }

export function createDefaultFireflyNpc(options: {
  id: string
  displayName?: string
  prompt?: string
  title?: string
  excerpt?: string
  body?: string
}): EditorNpcData {
  const displayName = options.displayName?.trim() || 'Firefly NPC'
  return {
    id: options.id,
    archetype: 'firefly',
    displayName,
    interaction: {
      enabled: true,
      mode: 'click',
      prompt: options.prompt ?? 'Listen',
    },
    conversation: {
      mode: 'read-only',
      title: options.title ?? displayName,
      excerpt: options.excerpt ?? 'A patient glow waits for authored dialogue.',
      body:
        options.body ??
        'Write this firefly conversation for the current level.',
      durationMs: 7000,
    },
    behavior: {
      type: 'hover-wander',
      radius: 0.16,
      speed: 0.18,
      hoverHeight: 0.28,
      bobAmplitude: 0.08,
      bobSpeed: 0.55,
    },
    presentation: {
      type: 'firefly',
      color: '#ff4658',
      secondaryColor: '#f5f1a8',
      size: 0.58,
      spriteIntensity: 1.15,
      lightIntensity: 1.15,
      lightDistance: 4.6,
      lightDecay: 1.25,
      twinkleSpeed: 0.9,
      lightBurstBoost: 1.25,
      selectionLightBoost: 3,
      lightBurstSpriteBoost: 0.55,
      shockwaveEnabled: false,
    },
  }
}

function toFiniteNumber(value: string) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

export function applyEditorNpcPatch(
  npc: EditorNpcData,
  patch: EditorNpcPatch,
): EditorNpcData {
  if (patch.scope === 'identity') {
    const nextValue = patch.value.trim()
    return {
      ...npc,
      [patch.field]:
        patch.field === 'displayName' ? nextValue || undefined : nextValue,
    }
  }

  if (patch.scope === 'interaction') {
    if (patch.field === 'prompt') {
      return {
        ...npc,
        interaction: {
          ...npc.interaction,
          prompt: patch.value,
        },
      }
    }
    return {
      ...npc,
      interaction: {
        ...npc.interaction,
        enabled: patch.value === 'click',
        mode: patch.value === 'click' ? 'click' : 'disabled',
      },
    }
  }

  if (patch.scope === 'conversationMode') {
    if (patch.value === 'none') {
      return { ...npc, conversation: { mode: 'none' } }
    }
    if (patch.value === 'profile') {
      return {
        ...npc,
        conversation: {
          mode: 'profile',
          personalityId:
            npc.conversation?.mode === 'profile'
              ? npc.conversation.personalityId
              : '',
        },
      }
    }
    return {
      ...npc,
      conversation: {
        mode: 'read-only',
        title:
          npc.conversation?.mode === 'read-only'
            ? npc.conversation.title
            : npc.displayName,
        excerpt:
          npc.conversation?.mode === 'read-only'
            ? npc.conversation.excerpt
            : '',
        body:
          npc.conversation?.mode === 'read-only' ? npc.conversation.body : '',
        durationMs:
          npc.conversation?.mode === 'read-only'
            ? npc.conversation.durationMs
            : 7000,
      },
    }
  }

  if (patch.scope === 'conversationText') {
    if (npc.conversation?.mode === 'profile') {
      if (patch.field !== 'personalityId') return npc
      return {
        ...npc,
        conversation: {
          ...npc.conversation,
          personalityId: patch.value.trim() || '',
        },
      }
    }
    if (npc.conversation?.mode === 'read-only') {
      if (patch.field === 'personalityId') return npc
      return {
        ...npc,
        conversation: {
          ...npc.conversation,
          [patch.field]: patch.value,
        },
      }
    }
    return npc
  }

  if (patch.scope === 'conversationNumber') {
    if (npc.conversation?.mode !== 'read-only') return npc
    const numericValue = toFiniteNumber(patch.value)
    return {
      ...npc,
      conversation: {
        ...npc.conversation,
        [patch.field]:
          numericValue === null || numericValue <= 0 ? undefined : numericValue,
      },
    }
  }

  if (patch.scope === 'behaviorMode') {
    return {
      ...npc,
      behavior:
        patch.value === 'static'
          ? { type: 'static' }
          : {
              type: 'hover-wander',
              radius:
                npc.behavior?.type === 'hover-wander'
                  ? npc.behavior.radius
                  : 0.16,
              speed:
                npc.behavior?.type === 'hover-wander'
                  ? npc.behavior.speed
                  : 0.18,
              hoverHeight:
                npc.behavior?.type === 'hover-wander'
                  ? npc.behavior.hoverHeight
                  : 0.28,
              bobAmplitude:
                npc.behavior?.type === 'hover-wander'
                  ? npc.behavior.bobAmplitude
                  : 0.08,
              bobSpeed:
                npc.behavior?.type === 'hover-wander'
                  ? npc.behavior.bobSpeed
                  : 0.55,
            },
    }
  }

  if (patch.scope === 'behaviorNumber') {
    if (npc.behavior?.type !== 'hover-wander') return npc
    const numericValue = toFiniteNumber(patch.value)
    if (numericValue === null) return npc
    return {
      ...npc,
      behavior: {
        ...npc.behavior,
        [patch.field]: numericValue,
      },
    }
  }

  if (patch.scope === 'presentationText') {
    if (npc.presentation.type !== 'firefly') return npc
    return {
      ...npc,
      presentation: {
        ...npc.presentation,
        [patch.field]: patch.value || undefined,
      },
    }
  }

  if (patch.scope === 'presentationNumber') {
    if (npc.presentation.type !== 'firefly') return npc
    const numericValue = toFiniteNumber(patch.value)
    if (numericValue === null) return npc
    return {
      ...npc,
      presentation: {
        ...npc.presentation,
        [patch.field]: numericValue,
      },
    }
  }

  if (patch.scope === 'presentationBoolean') {
    if (npc.presentation.type !== 'firefly') return npc
    return {
      ...npc,
      presentation: {
        ...npc.presentation,
        [patch.field]: patch.value,
      },
    }
  }

  return npc
}
