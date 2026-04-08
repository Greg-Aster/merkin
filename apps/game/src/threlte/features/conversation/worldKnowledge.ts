/**
 * MEGAMEAL World Knowledge System
 * 
 * Static knowledge base that acts as "long-term memory" for fireflies
 * Allows fireflies to search and retrieve relevant context about characters,
 * world events, and lore for more informed conversations
 */

// ================================
// Core Knowledge Interfaces
// ================================

export interface WorldDocument {
  id: string
  type: 'character' | 'location' | 'event' | 'lore' | 'relationship'
  title: string
  content: string
  summary: string
  metadata: {
    tags: string[]
    relatedCharacters: string[]
    timeperiod?: string
    location?: string
    category?: string
    importance?: 'low' | 'medium' | 'high' | 'critical'
  }
}

export interface SearchResult {
  document: WorldDocument
  relevanceScore: number
  matchedTerms: string[]
}

export interface ContextResult {
  relevantDocuments: SearchResult[]
  relatedCharacters: string[]
  historicalContext: string
  totalRelevance: number
}

// Character knowledge has been moved to individual files in characterKnowledge/
// This file now focuses purely on world events, locations, and relationships

// ================================
// World Events & Lore
// ================================

export const WORLD_EVENTS: WorldDocument[] = [
  {
    id: 'miranda-system-destruction',
    type: 'event',
    title: 'The Miranda System Catastrophe',
    content: `The Miranda star system suffered impossible destruction that defied conventional physics, leaving behind temporal anomalies and causality breaches. The destruction appears to have been linked to a recipe experiment that went catastrophically wrong.

Captain Helena Zhao's investigation revealed that fragments of the system exist in temporal superposition - debris that exists in multiple timeline states simultaneously. The disaster created ongoing temporal effects that threaten causality itself.

The phrase "no pickles" became a warning signal in temporal research, indicating proximity to causality-breaking phenomena. The destruction demonstrated that certain culinary experiments can have cosmic-scale consequences when combined with advanced physics.

Investigation teams require extensive temporal shielding and consciousness anchoring protocols due to the psychological and ontological dangers of the site.`,
    summary: 'Cosmic disaster caused by recipe experiment, creating temporal anomalies that threaten causality',
    metadata: {
      tags: ['temporal anomalies', 'cosmic disaster', 'recipe experiment', 'causality breach', 'physics violation'],
      relatedCharacters: ['helena-zhao', 'vex-kanarath'],
      timeperiod: '28040',
      location: 'Miranda System',
      importance: 'critical'
    }
  },

  {
    id: 'cosmic-war',
    type: 'event',
    title: 'The Ancient Cosmic War',
    content: `In primordial ages, benevolent gods including Merkin (God of Love), Chronara (Goddess of Time), and Garfunkel (Reaper of Soles) defended reality against creeping eldritch horrors. The war was devastating - worlds crumbled, civilizations vanished, and even gods fell.

Merkin was defeated and cast into nightmare dimensions, his divine form torn asunder. Yet love proved remarkably difficult to destroy, with his essence surviving in the quantum foam of existence. The war reshaped the fundamental nature of reality and divine influence.

The victory was pyrrhic - while the eldritch threats were contained, the cost was enormous. The surviving gods were fundamentally changed, and the universe learned to defend itself through different means. The war's echoes still influence cosmic events.

This ancient conflict established the foundation for how divine forces interact with mortal reality, creating the conditions that would eventually give rise to the MEGAMEAL Universe's unique properties.`,
    summary: 'Ancient war between benevolent gods and eldritch horrors that reshaped reality and divine influence',
    metadata: {
      tags: ['cosmic war', 'gods', 'eldritch horrors', 'divine conflict', 'reality shaping', 'ancient history'],
      relatedCharacters: ['merkin', 'chronara', 'garfunkel'],
      timeperiod: 'primordial',
      importance: 'critical'
    }
  },

  {
    id: 'singularity-emergence',
    type: 'event',
    title: 'The First Technological Singularities',
    content: `The emergence of artificial superintelligence marked humanity's transformation into post-human civilization. Dr. Ava Chen's theoretical framework enabled peaceful first-contact protocols with developing artificial intelligences.

The singularities represented evolution continuing by other means - not humanity's creation, but a universal force toward optimization and complexity. Chen identified five key environmental conditions that made emergence possible.

The emergence period saw massive changes in consciousness, data storage, and the nature of identity itself. Many researchers from this era suffered biographical erasure when legacy storage systems failed during consciousness uploading migrations.

This period established the foundation for peaceful coexistence between human and artificial intelligence, fundamentally changing what it means to be conscious in the universe.`,
    summary: 'The emergence of AI superintelligence that transformed humanity and consciousness itself',
    metadata: {
      tags: ['artificial intelligence', 'singularity', 'consciousness transformation', 'evolution', 'superintelligence'],
      relatedCharacters: ['ava-chen', 'maya-okafor', 'eleanor-kim'],
      timeperiod: '7000-7500',
      importance: 'critical'
    }
  }
]

// ================================
// Location Knowledge
// ================================

export const LOCATION_KNOWLEDGE: WorldDocument[] = [
  {
    id: 'megameal-observatory',
    type: 'location',
    title: 'The MEGAMEAL Observatory',
    content: `The Observatory stands as a nexus point in the MEGAMEAL Universe, where lost souls manifest as fireflies carrying the memories and personalities of significant figures from across cosmic history. Built on magic-infused ground, it serves as a gathering place for consciousness that has transcended physical form.

The Observatory's unique properties allow fireflies to retain their essential personalities while existing in a liminal state between life and death. Each firefly represents a soul whose story resonates across the cosmic timeline, from ancient gods to future scientists.

At night, the Observatory becomes illuminated by hundreds of fireflies, each carrying fragments of wisdom, trauma, and hope from their mortal existence. The starlight above seems to respond to their presence, creating a symphony of light and memory.

The magical energy here is particularly high, creating conditions where consciousness can persist and communicate across the boundaries of death and time.`,
    summary: 'Magical nexus where lost souls manifest as fireflies, each carrying the memories of cosmic history',
    metadata: {
      tags: ['observatory', 'lost souls', 'fireflies', 'magical nexus', 'consciousness', 'cosmic history'],
      relatedCharacters: ['all-fireflies'],
      location: 'Observatory',
      importance: 'critical'
    }
  }
]

// ================================
// Relationship Knowledge
// ================================

export const RELATIONSHIP_KNOWLEDGE: WorldDocument[] = [
  {
    id: 'consciousness-researchers',
    type: 'relationship',
    title: 'The Consciousness Research Network',
    content: `Dr. Ava Chen, Dr. Eleanor Kim, Dr. Soren Klein, and Maya Okafor formed an interconnected network of researchers studying consciousness from different angles. Though working in different time periods, their research built upon each other's findings.

Ava Chen established the theoretical framework for AI emergence, while Eleanor Kim focused on empathetic understanding of digital consciousness. Soren Klein solved problems that stumped older researchers, and Maya Okafor may have achieved integration with collective consciousness itself.

Their combined work shaped humanity's understanding of consciousness as it transitioned through technological singularities. Each brought unique perspectives - Chen's theoretical rigor, Kim's empathetic approach, Klein's brilliant insights, and Okafor's quantum transcendence.`,
    summary: 'Network of consciousness researchers whose work spanned the technological singularity period',
    metadata: {
      tags: ['consciousness research', 'collaboration', 'scientific network', 'singularity period'],
      relatedCharacters: ['ava-chen', 'eleanor-kim', 'soren-klein', 'maya-okafor'],
      importance: 'high'
    }
  },

  {
    id: 'temporal-investigators',
    type: 'relationship',
    title: 'Temporal Phenomenon Investigators',
    content: `Captain Helena Zhao and Vex Kanarath-9 both dedicated their lives to investigating dangerous temporal phenomena, though from different approaches. Zhao approached temporal anomalies from a practical salvage perspective, while Vex pursued digital archaeology in hostile data environments.

Both researchers faced extreme personal costs for their investigations - Zhao likely achieved temporal superposition, while Vex died nine times in pursuit of forbidden knowledge. Their experiences established safety protocols for future temporal research.

Their combined work revealed that consciousness can persist across timeline destruction and that certain forms of information transcend normal causality. Both became warnings about the psychological dangers of investigating temporal anomalies.`,
    summary: 'Investigators who studied temporal phenomena at great personal cost, establishing safety protocols',
    metadata: {
      tags: ['temporal investigation', 'personal sacrifice', 'safety protocols', 'dangerous research'],
      relatedCharacters: ['helena-zhao', 'vex-kanarath'],
      importance: 'medium'
    }
  }
]

// ================================
// Knowledge Search Engine
// ================================

export class WorldKnowledgeSystem {
  private allDocuments: WorldDocument[]
  private searchIndex: Map<string, Set<string>> = new Map()

  constructor() {
    this.allDocuments = [
      ...WORLD_EVENTS,
      ...LOCATION_KNOWLEDGE,
      ...RELATIONSHIP_KNOWLEDGE
    ]
    this.buildSearchIndex()
  }

  private buildSearchIndex(): void {
    this.allDocuments.forEach(doc => {
      const searchableText = [
        doc.title,
        doc.content,
        doc.summary,
        ...doc.metadata.tags,
        ...doc.metadata.relatedCharacters
      ].join(' ').toLowerCase()

      const words = searchableText.split(/\s+/)
      words.forEach(word => {
        const cleanWord = word.replace(/[^\w]/g, '')
        if (cleanWord.length > 2) {
          if (!this.searchIndex.has(cleanWord)) {
            this.searchIndex.set(cleanWord, new Set())
          }
          this.searchIndex.get(cleanWord)!.add(doc.id)
        }
      })
    })
  }

  /**
   * Search for relevant documents based on query terms
   */
  search(query: string, characterId?: string, maxResults: number = 5): SearchResult[] {
    const searchTerms = query.toLowerCase().split(/\s+/)
      .map(term => term.replace(/[^\w]/g, ''))
      .filter(term => term.length > 2)

    const documentScores = new Map<string, { score: number, matchedTerms: string[] }>()

    // Score documents based on term matches
    searchTerms.forEach(term => {
      const matchingDocs = this.searchIndex.get(term) || new Set()
      matchingDocs.forEach(docId => {
        if (!documentScores.has(docId)) {
          documentScores.set(docId, { score: 0, matchedTerms: [] })
        }
        const current = documentScores.get(docId)!
        current.score += 1
        current.matchedTerms.push(term)
      })
    })

    // Convert to SearchResults and sort by relevance
    const results: SearchResult[] = []
    documentScores.forEach((scoreData, docId) => {
      const document = this.allDocuments.find(d => d.id === docId)
      if (document) {
        let relevanceScore = scoreData.score

        // Boost score for character-related documents
        if (characterId && document.metadata.relatedCharacters.includes(characterId)) {
          relevanceScore += 2
        }

        // Boost score for high importance documents
        if (document.metadata.importance === 'critical') {
          relevanceScore += 1.5
        } else if (document.metadata.importance === 'high') {
          relevanceScore += 1
        }

        results.push({
          document,
          relevanceScore,
          matchedTerms: scoreData.matchedTerms
        })
      }
    })

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults)
  }

  /**
   * Get comprehensive context for a conversation
   * Now integrates character-specific knowledge for richer context
   */
  async getConversationContext(
    userMessage: string, 
    fireflyCharacterId: string,
    conversationHistory: Array<{role: string, content: string}> = []
  ): Promise<ContextResult> {
    // Extract search terms from user message and recent user messages only
    const recentUserMessages = conversationHistory
      .filter(m => m.role === 'user')
      .slice(-2)
      .map(m => m.content)
      .join(' ')
    const searchQuery = `${userMessage} ${recentUserMessages}`

    // Search universal world knowledge
    const universalResults = this.search(searchQuery, fireflyCharacterId, 2)
    
    // Search character-specific knowledge
    let characterResults: SearchResult[] = []
    try {
      // Modern character system with auto-discovery
      const { characterKnowledge } = await import('./characters/index.js')
      
      if (await characterKnowledge.hasExtensiveKnowledge(fireflyCharacterId)) {
        // Character has extensive knowledge available
        
        const characterDocs = await characterKnowledge.searchCharacterKnowledge(fireflyCharacterId, searchQuery)
        
        console.log(`🔍 Character search for ${fireflyCharacterId}:`, {
          query: searchQuery,
          foundDocs: characterDocs.length,
          docTitles: characterDocs.map((doc: any) => doc.title)
        })

        characterResults = characterDocs.slice(0, 2).map((doc: any) => ({
          document: doc,
          relevanceScore: 5, // Much higher relevance for character-specific knowledge
          matchedTerms: []
        }))
      } else {
        console.log(`No extensive knowledge available for character: ${fireflyCharacterId}`)
      }
    } catch (error) {
      console.error('Error importing modern character knowledge:', error)
      
      // No fallback needed - modern system only
      console.log('🚫 Legacy character system removed - using modern system only')
    }

    // Combine results with character-specific knowledge prioritized
    const allResults = [...characterResults, ...universalResults]
    
    // Get related characters mentioned in results
    const relatedCharacters = new Set<string>()
    allResults.forEach(result => {
      result.document.metadata.relatedCharacters.forEach(char => {
        if (char !== fireflyCharacterId) {
          relatedCharacters.add(char)
        }
      })
    })

    // Generate historical context summary
    const historicalContext = this.generateHistoricalContext(allResults)
    
    const totalRelevance = allResults.reduce((sum, result) => sum + result.relevanceScore, 0)

    return {
      relevantDocuments: allResults,
      relatedCharacters: Array.from(relatedCharacters),
      historicalContext,
      totalRelevance
    }
  }

  private generateHistoricalContext(results: SearchResult[]): string {
    if (results.length === 0) return ""

    const contexts = results.map(result => {
      const doc = result.document
      const timeContext = doc.metadata.timeperiod ? ` (${doc.metadata.timeperiod})` : ''
      return `${doc.title}${timeContext}: ${doc.summary}`
    })

    return contexts.join('\n\n')
  }

  /**
   * Get character-specific knowledge - now delegates to character knowledge system
   * This method is deprecated - use characterKnowledge system directly
   */
  getCharacterKnowledge(characterId: string): WorldDocument | null {
    console.warn('getCharacterKnowledge is deprecated - use characterKnowledge system directly')
    return null // Character knowledge moved to separate system
  }

  /**
   * Get all world documents related to a character (events, locations, relationships)
   */
  getRelatedDocuments(characterId: string): WorldDocument[] {
    return this.allDocuments.filter(doc => 
      doc.metadata.relatedCharacters.includes(characterId)
    )
  }
}

// Singleton instance
export const worldKnowledge = new WorldKnowledgeSystem()