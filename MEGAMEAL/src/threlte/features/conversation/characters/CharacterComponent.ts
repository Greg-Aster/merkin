/**
 * ECS Character Component
 * 
 * Clean interface between ECS entities and the character system
 * Provides all character functionality through a unified component
 */

import { characterRegistry } from './CharacterRegistry'
import type { CharacterDefinition, FireflyPersonality } from './types'
import type { WorldDocument } from '../worldKnowledge'

export class CharacterComponent {
  private characterId: string
  private _character: CharacterDefinition | null = null
  
  constructor(characterId: string) {
    this.characterId = characterId
  }
  
  /**
   * Get the character definition (cached)
   */
  private async getCharacter(): Promise<CharacterDefinition | null> {
    if (!this._character) {
      this._character = await characterRegistry.getCharacter(this.characterId)
    }
    return this._character
  }
  
  // ================================
  // Firefly Personality Interface
  // ================================
  
  /**
   * Get firefly personality for conversation system
   */
  async getFireflyPersonality(): Promise<FireflyPersonality | null> {
    const character = await this.getCharacter()
    return character?.fireflyPersonality || null
  }
  
  /**
   * Get firefly opening statement
   */
  async getOpeningStatement(): Promise<string> {
    const personality = await this.getFireflyPersonality()
    return personality?.knowledge.openingStatement || ''
  }
  
  /**
   * Get firefly conversation behavior
   */
  async getConversationBehavior() {
    const personality = await this.getFireflyPersonality()
    return personality?.conversation || null
  }
  
  /**
   * Get firefly visual description
   */
  async getVisualDescription() {
    const personality = await this.getFireflyPersonality()
    return personality?.visual || null
  }
  
  // ================================
  // Knowledge Interface
  // ================================
  
  /**
   * Search character's knowledge base
   */
  async searchKnowledge(query: string): Promise<WorldDocument[]> {
    const character = await this.getCharacter()
    return character?.searchKnowledge(query) || []
  }
  
  /**
   * Get character's perspective on a topic
   */
  async getPerspective(topic: string): Promise<string> {
    const character = await this.getCharacter()
    return character?.getPerspective(topic) || ''
  }
  
  /**
   * Get all character knowledge
   */
  async getAllKnowledge(): Promise<WorldDocument[]> {
    const character = await this.getCharacter()
    return character?.getAllKnowledge() || []
  }
  
  /**
   * Check if character has extensive knowledge
   */
  async hasExtensiveKnowledge(): Promise<boolean> {
    return await characterRegistry.hasExtensiveKnowledge(this.characterId)
  }
  
  /**
   * Get character's authored content (research, writings, etc.)
   */
  async getAuthoredContent(): Promise<WorldDocument[]> {
    const character = await this.getCharacter()
    if (!character) return []
    
    const knowledge = character.getAllKnowledge()
    return knowledge.filter(doc => 
      doc.type === 'lore' || 
      (doc.type === 'event' && doc.metadata.tags.includes('authored content'))
    )
  }
  
  /**
   * Get character's relationships
   */
  async getRelationships(): Promise<WorldDocument[]> {
    const character = await this.getCharacter()
    if (!character) return []
    
    const knowledge = character.getAllKnowledge()
    return knowledge.filter(doc => doc.type === 'relationship')
  }
  
  /**
   * Get character's technical/professional knowledge
   */
  async getTechnicalKnowledge(): Promise<WorldDocument[]> {
    const character = await this.getCharacter()
    if (!character) return []
    
    const knowledge = character.getAllKnowledge()
    return knowledge.filter(doc => 
      doc.metadata.tags.some(tag => 
        ['technical', 'professional', 'scientific', 'research', 'investigation'].includes(tag)
      )
    )
  }
  
  // ================================
  // Conversation Context Building
  // ================================
  
  /**
   * Build enhanced conversation context for AI
   */
  async buildConversationContext(
    userMessage: string,
    conversationHistory: Array<{role: string, content: string}> = []
  ): Promise<{
    characterKnowledge: WorldDocument[]
    relevantMemories: WorldDocument[]
    personalPerspective: string
    contextSummary: string
    fireflyPersonality: FireflyPersonality | null
  }> {
    const character = await this.getCharacter()
    if (!character) {
      return {
        characterKnowledge: [],
        relevantMemories: [],
        personalPerspective: '',
        contextSummary: '',
        fireflyPersonality: null
      }
    }
    
    // Get all character knowledge
    const allKnowledge = character.getAllKnowledge()
    
    // Search for relevant memories based on user message and conversation
    const searchTerms = [
      userMessage,
      ...conversationHistory.slice(-3).map(msg => msg.content)
    ].join(' ')
    
    const relevantMemories = character.searchKnowledge(searchTerms).slice(0, 3)
    
    // Get character's perspective on the main topics
    const personalPerspective = character.getPerspective(userMessage)
    
    // Get firefly personality
    const fireflyPersonality = character.fireflyPersonality
    
    // Build context summary
    const contextSummary = this.buildContextSummary(relevantMemories, personalPerspective)
    
    return {
      characterKnowledge: allKnowledge,
      relevantMemories,
      personalPerspective,
      contextSummary,
      fireflyPersonality
    }
  }
  
  private buildContextSummary(memories: WorldDocument[], perspective: string): string {
    if (memories.length === 0 && !perspective) return ""
    
    let summary = ""
    
    if (memories.length > 0) {
      summary += "RELEVANT MEMORIES:\n"
      summary += memories.map(mem => `- ${mem.title}: ${mem.summary}`).join('\n')
      summary += "\n\n"
    }
    
    if (perspective) {
      summary += "PERSONAL PERSPECTIVE:\n"
      summary += perspective
    }
    
    return summary
  }
  
  // ================================
  // Character Identity
  // ================================
  
  /**
   * Get character name
   */
  async getName(): Promise<string> {
    const character = await this.getCharacter()
    return character?.name || 'Unknown'
  }
  
  /**
   * Get character ID
   */
  getId(): string {
    return this.characterId
  }
  
  /**
   * Get all character aliases
   */
  async getAliases(): Promise<string[]> {
    const character = await this.getCharacter()
    return character?.aliases || []
  }
  
  /**
   * Check if character exists
   */
  async exists(): Promise<boolean> {
    return await characterRegistry.hasCharacter(this.characterId)
  }
  
  // ================================
  // Development Helpers
  // ================================
  
  /**
   * Get raw character definition (for debugging)
   */
  async getRawCharacter(): Promise<CharacterDefinition | null> {
    return await this.getCharacter()
  }
  
  /**
   * Reload character (clear cache)
   */
  async reload(): Promise<void> {
    this._character = null
    characterRegistry.clearCache()
    await this.getCharacter()
  }
}