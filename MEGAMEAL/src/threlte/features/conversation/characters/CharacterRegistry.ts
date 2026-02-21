/**
 * Modern Character Registry with Auto-Discovery
 * 
 * ECS-aligned registry that dynamically loads character definitions
 * No manual imports or mappings required - just drop character files in /characters/
 */

import type { CharacterDefinition } from './types'

export class CharacterRegistry {
  private characters = new Map<string, CharacterDefinition>()
  private loaded = new Set<string>()
  private _availableCharacterIds: string[] | null = null
  
  /**
   * Get list of all available character IDs by scanning the definitions directory
   */
  async getAvailableCharacterIds(): Promise<string[]> {
    if (this._availableCharacterIds) {
      return this._availableCharacterIds
    }
    
    // Known character files - in a real implementation this would scan the directory
    // For now, we'll use the known character list
    this._availableCharacterIds = [
      'elara-voss', 'helena-zhao', 'ava-chen', 'maya-okafor',
      'soren-klein', 'gregory-aster', 'kaelen-vance', 
      'eleanor-kim', 'vex-kanarath', 'merkin'
    ]
    
    console.log(`📚 Discovered ${this._availableCharacterIds.length} available characters`)
    return this._availableCharacterIds
  }
  
  /**
   * Normalize character ID to handle various formats
   * firefly_elara_elara -> elara-voss
   * firefly_elara -> elara-voss  
   * dr-elara-voss -> elara-voss
   * Gregory-aster -> gregory-aster
   */
  private normalizeId(characterId: string | undefined): string {
    if (!characterId) {
      console.warn('⚠️ normalizeId called with undefined characterId')
      return ''
    }
    
    // Convert to lowercase for case-insensitive handling
    const lowerCharacterId = characterId.toLowerCase()
    
    // Handle duplicate ID patterns (firefly_name_name -> firefly_name)
    const duplicatePattern = /^firefly_(\w+)_\1$/
    const duplicateMatch = lowerCharacterId.match(duplicatePattern)
    if (duplicateMatch) {
      return this.normalizeId(`firefly_${duplicateMatch[1]}`)
    }
    
    // Handle firefly_ prefix patterns
    if (lowerCharacterId.startsWith('firefly_')) {
      const name = lowerCharacterId.replace('firefly_', '')
      return this.mapNameToId(name)
    }
    
    // Handle dr- prefix patterns
    if (lowerCharacterId.startsWith('dr-')) {
      return lowerCharacterId
    }
    
    // Handle plain names (including properly formatted IDs like gregory-aster)
    return this.mapNameToId(lowerCharacterId)
  }
  
  /**
   * Map character names to their canonical file IDs
   */
  private mapNameToId(name: string): string {
    // Convert to lowercase for case-insensitive matching
    const lowerName = name.toLowerCase()
    
    const nameMapping: Record<string, string> = {
      'ava': 'ava-chen',
      'helena': 'helena-zhao', 
      'elara': 'elara-voss',
      'eleanor': 'eleanor-kim',
      'gregory': 'gregory-aster',
      'kaelen': 'kaelen-vance',
      'soren': 'soren-klein',
      'vex': 'vex-kanarath',
      'merkin': 'merkin',
      'maya': 'maya-okafor',
      // Also handle full IDs that are already formatted correctly
      'gregory-aster': 'gregory-aster',
      'ava-chen': 'ava-chen',
      'helena-zhao': 'helena-zhao',
      'elara-voss': 'elara-voss',
      'eleanor-kim': 'eleanor-kim',
      'kaelen-vance': 'kaelen-vance',
      'soren-klein': 'soren-klein',
      'vex-kanarath': 'vex-kanarath',
      'maya-okafor': 'maya-okafor'
    }
    
    return nameMapping[lowerName] || lowerName
  }
  
  /**
   * Get character definition with auto-loading
   */
  async getCharacter(characterId: string): Promise<CharacterDefinition | null> {
    const normalizedId = this.normalizeId(characterId)
    
    // Return cached if already loaded
    if (this.characters.has(normalizedId)) {
      return this.characters.get(normalizedId)!
    }
    
    // Try to dynamically load character
    try {
      const characterModule = await import(`./definitions/${normalizedId}.ts`)
      const character = characterModule.character as CharacterDefinition
      
      // Validate character definition
      if (!this.validateCharacter(character)) {
        console.error(`Invalid character definition for ${normalizedId}`)
        return null
      }
      
      // Cache and return
      this.characters.set(normalizedId, character)
      this.loaded.add(normalizedId)
      
      console.log(`📚 Loaded character: ${character.name} (${normalizedId})`)
      return character
      
    } catch (error) {
      console.warn(`❌ Could not load character: ${normalizedId}`, error)
      return null
    }
  }
  
  /**
   * Check if character exists (without loading)
   */
  async hasCharacter(characterId: string): Promise<boolean> {
    const normalizedId = this.normalizeId(characterId)
    
    if (this.loaded.has(normalizedId)) {
      return true
    }
    
    try {
      await import(`./definitions/${normalizedId}.ts`)
      return true
    } catch {
      return false
    }
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
        goals: firefly.goals
      },
      
      // Map knowledge structure
      knowledge: {
        topics: firefly.knowledge.topics,
        memories: firefly.knowledge.memories,
        secrets: firefly.knowledge.secrets,
        backstory: firefly.knowledge.backstory,
        openingStatement: firefly.knowledge.openingStatement
      },
      
      // Map behavior structure  
      behavior: {
        greetingStyle: firefly.behavior.greetingStyle,
        conversationStyle: firefly.behavior.conversationStyle,
        defaultMood: firefly.behavior.defaultMood,
        emotionalRange: firefly.behavior.emotionalRange,
        speechPatterns: firefly.behavior.speechPatterns
      },
      
      // Map visual structure
      visual: {
        description: firefly.visual.description,
        expressions: firefly.visual.expressions
      },
      
      // Map conversation structure
      conversation: {
        responseDelay: firefly.conversation.responseDelay,
        farewellTriggers: firefly.conversation.farewellTriggers,
        topicTransitions: firefly.conversation.topicTransitions
      }
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
    return character &&
           typeof character.id === 'string' &&
           typeof character.name === 'string' &&
           Array.isArray(character.aliases) &&
           character.fireflyPersonality &&
           character.knowledge &&
           typeof character.searchKnowledge === 'function' &&
           typeof character.getPerspective === 'function' &&
           typeof character.getAllKnowledge === 'function'
  }
  
  /**
   * Clear cache (useful for development)
   */
  clearCache(): void {
    this.characters.clear()
    this.loaded.clear()
    console.log('🧹 Character registry cache cleared')
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
  (window as any).characterRegistry = characterRegistry
  console.log('🔧 CharacterRegistry available globally for debugging')
}