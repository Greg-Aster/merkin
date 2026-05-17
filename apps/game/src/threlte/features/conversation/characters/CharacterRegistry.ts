/**
 * Modern Character Registry with Auto-Discovery
 *
 * ECS-aligned registry that dynamically loads character definitions from the
 * shared canonical profile manifest.
 */

import { normalizeConversationProfileId } from '../../../engine/npcValidationCore.mjs'
import { CANONICAL_CONVERSATION_PROFILE_IDS } from './profileManifest.mjs'
import type { CharacterDefinition } from './types'

type CharacterModule = {
  character: CharacterDefinition
}

type ImportMetaWithVite = ImportMeta & {
  env?: { DEV?: boolean }
  glob?: <T>(pattern: string) => Record<string, () => Promise<T>>
}

const importMeta = import.meta as ImportMetaWithVite
const isDev = Boolean(importMeta.env?.DEV)

const nodeCharacterDefinitionModules: Record<
  string,
  () => Promise<CharacterModule>
> = {
  './definitions/ava-chen.ts': () => import('./definitions/ava-chen.ts'),
  './definitions/eleanor-kim.ts': () => import('./definitions/eleanor-kim.ts'),
  './definitions/elara-voss.ts': () => import('./definitions/elara-voss.ts'),
  './definitions/gregory-aster.ts': () =>
    import('./definitions/gregory-aster.ts'),
  './definitions/helena-zhao.ts': () => import('./definitions/helena-zhao.ts'),
  './definitions/kaelen-vance.ts': () =>
    import('./definitions/kaelen-vance.ts'),
  './definitions/maya-okafor.ts': () => import('./definitions/maya-okafor.ts'),
  './definitions/merkin.ts': () => import('./definitions/merkin.ts'),
  './definitions/soren-klein.ts': () => import('./definitions/soren-klein.ts'),
  './definitions/vex-kanarath.ts': () =>
    import('./definitions/vex-kanarath.ts'),
}

const characterDefinitionModules =
  typeof importMeta.glob === 'function'
    ? importMeta.glob<CharacterModule>('./definitions/*.ts')
    : nodeCharacterDefinitionModules

function getCharacterIdFromModulePath(path: string) {
  return path.replace(/^\.\/definitions\//, '').replace(/\.ts$/, '')
}

function getDiscoveredCharacterIds() {
  return Object.keys(characterDefinitionModules)
    .map(getCharacterIdFromModulePath)
    .sort()
}

export class CharacterRegistry {
  private characters = new Map<string, CharacterDefinition>()
  private loaded = new Set<string>()
  private _availableCharacterIds: string[] | null = null

  /**
   * Get list of all available character IDs from the shared profile manifest.
   */
  async getAvailableCharacterIds(): Promise<string[]> {
    if (this._availableCharacterIds) {
      return this._availableCharacterIds
    }

    this._availableCharacterIds = [...CANONICAL_CONVERSATION_PROFILE_IDS].sort()

    if (isDev) {
      const discoveredCharacterIds = getDiscoveredCharacterIds()
      const manifestIds = new Set(this._availableCharacterIds)
      const missingManifestIds = discoveredCharacterIds.filter(
        id => !manifestIds.has(id),
      )
      const missingDefinitionIds = this._availableCharacterIds.filter(
        id => !characterDefinitionModules[`./definitions/${id}.ts`],
      )
      if (missingManifestIds.length > 0 || missingDefinitionIds.length > 0) {
        console.warn('Character profile manifest is out of sync', {
          missingManifestIds,
          missingDefinitionIds,
        })
      }
      console.log(
        `📚 Discovered ${this._availableCharacterIds.length} available characters`,
      )
    }
    return this._availableCharacterIds
  }

  /**
   * Get character definition with auto-loading
   */
  async getCharacter(characterId: string): Promise<CharacterDefinition | null> {
    const normalizedId = normalizeConversationProfileId(characterId)

    // Return cached if already loaded
    if (this.characters.has(normalizedId)) {
      return this.characters.get(normalizedId)!
    }

    // Try to dynamically load character
    try {
      const loadCharacterModule =
        characterDefinitionModules[`./definitions/${normalizedId}.ts`]
      if (!loadCharacterModule) {
        return null
      }

      const characterModule = await loadCharacterModule()
      const character = characterModule.character as CharacterDefinition

      // Validate character definition
      if (!this.validateCharacter(character)) {
        console.error(`Invalid character definition for ${normalizedId}`)
        return null
      }

      // Cache and return
      this.characters.set(normalizedId, character)
      this.loaded.add(normalizedId)

      if (isDev) {
        console.log(`📚 Loaded character: ${character.name} (${normalizedId})`)
      }
      return character
    } catch (error) {
      if (isDev) {
        console.warn(`❌ Could not load character: ${normalizedId}`, error)
      }
      return null
    }
  }

  /**
   * Check if character exists (without loading)
   */
  async hasCharacter(characterId: string): Promise<boolean> {
    const normalizedId = normalizeConversationProfileId(characterId)

    if (this.loaded.has(normalizedId)) {
      return true
    }

    return (
      CANONICAL_CONVERSATION_PROFILE_IDS.includes(normalizedId) &&
      Boolean(characterDefinitionModules[`./definitions/${normalizedId}.ts`])
    )
  }

  /**
   * Get firefly personality for conversation system
   */
  async getFireflyPersonality(characterId: string) {
    const character = await this.getCharacter(characterId)
    return character?.fireflyPersonality || null
  }

  /**
   * Convert FireflyPersonality to NPCPersonality for conversation system
   */
  convertToNPCPersonality(character: CharacterDefinition): any {
    const firefly = character.fireflyPersonality

    return {
      id: character.id,
      name: character.name,
      species: firefly.species,
      age: firefly.age,

      // Convert flat structure to nested structure
      personality: {
        core: firefly.core,
        traits: firefly.traits,
        quirks: firefly.quirks,
        interests: firefly.interests,
        fears: firefly.fears,
        goals: firefly.goals,
      },

      // Map knowledge structure
      knowledge: {
        topics: firefly.knowledge.topics,
        memories: firefly.knowledge.memories,
        secrets: firefly.knowledge.secrets,
        backstory: firefly.knowledge.backstory,
        openingStatement: firefly.knowledge.openingStatement,
      },

      // Map behavior structure
      behavior: {
        greetingStyle: firefly.behavior.greetingStyle,
        conversationStyle: firefly.behavior.conversationStyle,
        defaultMood: firefly.behavior.defaultMood,
        emotionalRange: firefly.behavior.emotionalRange,
        speechPatterns: firefly.behavior.speechPatterns,
      },

      // Map visual structure
      visual: {
        description: firefly.visual.description,
        expressions: firefly.visual.expressions,
      },

      // Map conversation structure
      conversation: {
        responseDelay: firefly.conversation.responseDelay,
        farewellTriggers: firefly.conversation.farewellTriggers,
        topicTransitions: firefly.conversation.topicTransitions,
      },
    }
  }

  /**
   * Search character knowledge
   */
  async searchCharacterKnowledge(characterId: string, query: string) {
    const character = await this.getCharacter(characterId)
    return character?.searchKnowledge(query) || []
  }

  /**
   * Get character perspective on topic
   */
  async getCharacterPerspective(characterId: string, topic: string) {
    const character = await this.getCharacter(characterId)
    return character?.getPerspective(topic) || ''
  }

  /**
   * Get all character knowledge
   */
  async getAllCharacterKnowledge(characterId: string) {
    const character = await this.getCharacter(characterId)
    return character?.getAllKnowledge() || []
  }

  /**
   * Check if character has extensive knowledge available
   */
  async hasExtensiveKnowledge(characterId: string): Promise<boolean> {
    const character = await this.getCharacter(characterId)
    return character ? character.getAllKnowledge().length > 0 : false
  }

  /**
   * Get all loaded character IDs
   */
  getLoadedCharacters(): string[] {
    return Array.from(this.loaded)
  }

  /**
   * Get all character aliases for a given character
   */
  async getCharacterAliases(characterId: string): Promise<string[]> {
    const character = await this.getCharacter(characterId)
    return character?.aliases || []
  }

  /**
   * Validate character definition structure
   */
  private validateCharacter(character: any): character is CharacterDefinition {
    return (
      character &&
      typeof character.id === 'string' &&
      typeof character.name === 'string' &&
      Array.isArray(character.aliases) &&
      character.fireflyPersonality &&
      character.knowledge &&
      typeof character.searchKnowledge === 'function' &&
      typeof character.getPerspective === 'function' &&
      typeof character.getAllKnowledge === 'function'
    )
  }

  /**
   * Clear cache (useful for development)
   */
  clearCache(): void {
    this.characters.clear()
    this.loaded.clear()
    if (isDev) {
      console.log('🧹 Character registry cache cleared')
    }
  }

  /**
   * Preload character (for performance)
   */
  async preloadCharacter(characterId: string): Promise<void> {
    await this.getCharacter(characterId)
  }

  /**
   * Batch preload multiple characters
   */
  async preloadCharacters(characterIds: string[]): Promise<void> {
    await Promise.all(characterIds.map(id => this.preloadCharacter(id)))
  }
}

// Singleton instance
export const characterRegistry = new CharacterRegistry()

// Development helpers
if (typeof window !== 'undefined') {
  ;(window as any).characterRegistry = characterRegistry
  if (isDev) {
    console.log('🔧 CharacterRegistry available globally for debugging')
  }
}
