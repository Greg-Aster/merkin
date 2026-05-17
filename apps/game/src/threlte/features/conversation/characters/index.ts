/**
 * Modern Character System - Main Export
 *
 * ECS-aligned character system with auto-discovery and unified definitions
 * Single source of truth for character functionality
 */

import { characterRegistry } from './CharacterRegistry'

export { CharacterComponent } from './CharacterComponent'
export { characterRegistry, CharacterRegistry } from './CharacterRegistry'
export {
  CANONICAL_CONVERSATION_PROFILE_IDS,
  CONVERSATION_PROFILE_ALIAS_ENTRIES,
} from './profileManifest.mjs'
export {
  KNOWN_CONVERSATION_PROFILE_IDS,
  isKnownConversationProfileId,
  normalizeConversationProfileId,
} from '../../../engine/npcValidationCore.mjs'
export type {
  CharacterDefinition,
  FireflyPersonality,
  FireflyKnowledge,
  FireflyBehavior,
  FireflyVisual,
  FireflyConversation,
  CharacterKnowledge,
  CharacterBuilder,
} from './types'
export {
  FIREFLY_SPECIES,
  baseFireflyKnowledge,
  baseFireflyBehavior,
  getObservatoryContext,
  getFireflyConversationPrompts,
} from './types'

const isDev = import.meta.env?.DEV ?? false

// Compatibility layer for existing conversation system
export class CharacterKnowledgeCompatibilityLayer {
  /**
   * Legacy compatibility: hasExtensiveKnowledge
   */
  async hasExtensiveKnowledge(characterId: string): Promise<boolean> {
    return await characterRegistry.hasExtensiveKnowledge(characterId)
  }

  /**
   * Legacy compatibility: searchCharacterKnowledge
   */
  async searchCharacterKnowledge(characterId: string, query: string) {
    return await characterRegistry.searchCharacterKnowledge(characterId, query)
  }

  /**
   * Legacy compatibility: getCharacterPerspective
   */
  async getCharacterPerspective(characterId: string, topic: string) {
    return await characterRegistry.getCharacterPerspective(characterId, topic)
  }

  /**
   * Legacy compatibility: getCharacterKnowledge
   */
  async getCharacterKnowledge(characterId: string) {
    return await characterRegistry.getAllCharacterKnowledge(characterId)
  }
}

// Singleton instance for backwards compatibility
export const characterKnowledge = new CharacterKnowledgeCompatibilityLayer()

// Development helpers
if (typeof window !== 'undefined') {
  ;(window as any).characterSystem = {
    registry: characterRegistry,
    compatibility: characterKnowledge,
  }
  if (isDev) {
    console.log('🔧 Modern Character System loaded and available globally')
  }
}
