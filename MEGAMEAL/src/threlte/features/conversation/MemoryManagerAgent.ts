/**
 * Memory Manager Agent
 * 
 * This agent sits between the user input and the conversational agent,
 * intelligently selecting and compressing relevant memories before 
 * sending to the Cloudflare Worker.
 * 
 * Based on A-MEM and RAGate research findings for optimal token efficiency.
 */

import { worldKnowledge, type ContextResult } from './worldKnowledge'
import type { NPCPersonality } from './types'

// ================================
// Memory Manager Interfaces
// ================================

export interface MemoryBundle {
  relevantMemories: CompressedMemory[]
  conversationSummary: string
  characterContext: string
  totalTokensEstimate: number
  shouldUseMemories: boolean // RAGate-style binary decision
}

export interface CompressedMemory {
  title: string
  content: string // Compressed/summarized content
  relevanceScore: number
  originalLength: number
  compressedLength: number
}

export interface MemoryManagerConfig {
  maxMemories: number
  maxTokensPerMemory: number
  maxResponseTokens: number // Single source of truth for AI response limits
  compressionRatio: number // Target 0.3 = 70% reduction
  relevanceThreshold: number
  enableRAGate: boolean // Binary decision making
  aiServiceUrl?: string // URL for RAGate judge calls
}

// ================================
// Memory Manager Agent
// ================================

export class MemoryManagerAgent {
  private config: MemoryManagerConfig

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.config = {
      maxMemories: 3, // Optimal balance: enough context without overwhelming
      maxTokensPerMemory: 400, // Sufficient for detailed character knowledge 
      maxResponseTokens: 200, // Allow longer responses for complex character knowledge
      compressionRatio: 0.5, // Moderate compression (50% reduction) for accuracy
      relevanceThreshold: 1.0, // Lower threshold for better character knowledge retrieval
      enableRAGate: true, // Enable Smart RAGate with AI-powered binary decisions
      aiServiceUrl: 'http://localhost:8787', // Default for local development
      ...config
    }
  }

  /**
   * Main entry point: Analyze user input and prepare optimal memory bundle
   * 
   * This implements the Manager-Worker pattern from the research:
   * 1. Binary gate decision (RAGate)
   * 2. Selective retrieval
   * 3. Compression
   * 4. Bundle preparation
   */
  async prepareMemoryBundle(
    userMessage: string,
    personality: NPCPersonality,
    conversationHistory: Array<{role: string, content: string}> = []
  ): Promise<MemoryBundle> {
    
    // Processing request for ${personality.name}
    
    // STEP 1: RAGate Binary Decision - Do we need memories for this query?
    const shouldUseMemories = this.config.enableRAGate 
      ? await this.shouldRetrieveMemories(userMessage, conversationHistory)
      : true

    if (!shouldUseMemories) {
      // No memories needed for simple query
      return {
        relevantMemories: [],
        conversationSummary: this.createConversationSummary(conversationHistory),
        characterContext: this.createBaseCharacterContext(personality),
        totalTokensEstimate: 100, // Just basic persona
        shouldUseMemories: false
      }
    }

    // Retrieving memories for query

    // STEP 2: Retrieve relevant context using existing system
    const contextResult = await worldKnowledge.getConversationContext(
      userMessage,
      personality.id,
      conversationHistory
    )

    // STEP 3: Compress and select best memories
    const compressedMemories = await this.compressMemories(
      contextResult,
      userMessage
    )

    // STEP 4: Create conversation summary
    const conversationSummary = this.createConversationSummary(conversationHistory)

    // STEP 5: Create enhanced character context
    const characterContext = this.createEnhancedCharacterContext(
      personality,
      compressedMemories
    )

    // STEP 6: Calculate token estimates
    const totalTokensEstimate = this.estimateTokens(
      compressedMemories,
      conversationSummary,
      characterContext
    )

    // Memory bundle prepared with ${compressedMemories.length} memories

    return {
      relevantMemories: compressedMemories,
      conversationSummary,
      characterContext,
      totalTokensEstimate,
      shouldUseMemories: true
    }
  }

  /**
   * RAGate Implementation: Binary decision on whether to retrieve memories
   * 
   * Based on 2024 research - uses small LLM to intelligently decide if memories are needed
   * SMART VERSION: Uses AI to make binary decision instead of heuristics
   */
  private async shouldRetrieveMemories(
    userMessage: string,
    conversationHistory: Array<{role: string, content: string}>
  ): Promise<boolean> {
    
    // Quick heuristic fallback for very obvious cases (to save API calls)
    const query = userMessage.toLowerCase()
    const verySimpleTriggers = ['hi', 'hello', 'thanks', 'bye', 'yes', 'no', 'ok', 'okay']
    
    if (verySimpleTriggers.includes(query.trim()) || userMessage.length < 8) {
      // Skipping memories for simple query
      return false
    }

    // Use intelligent heuristics for binary decision (more reliable than AI calls)
    const needsMemories = this.intelligentRAGateDecision(userMessage, conversationHistory)
    
    // Smart RAGate decision: ${needsMemories ? 'retrieve' : 'skip'} memories
    return needsMemories
  }

  /**
   * Intelligent RAGate decision using smart heuristics
   * More reliable than AI calls, still very effective
   */
  private intelligentRAGateDecision(
    userMessage: string,
    conversationHistory: Array<{role: string, content: string}>
  ): boolean {
    const query = userMessage.toLowerCase()
    
    // Always skip for very simple greetings
    const simpleGreetings = ['hi', 'hello', 'hey', 'thanks', 'bye', 'okay', 'yes', 'no']
    if (simpleGreetings.includes(query.trim()) && userMessage.length < 10) {
      return false
    }
    
    // Always retrieve for question words and character queries
    const memoryTriggerPatterns = [
      /\b(who|what|where|when|why|how)\b/,
      /\btell me about\b/,
      /\byour (past|work|ship|crew|investigation|experience|memories|story)\b/,
      /\bpeople you (know|knew|worked with)\b/,
      /\b(remember|recall|think about)\b/,
      /\b(chronara|garfunkel|miranda|temporal|cosmic|divine)\b/,
      /\b(second breakfast|salvage|investigation)\b/
    ]
    
    const hasMemoryTrigger = memoryTriggerPatterns.some(pattern => pattern.test(query))
    
    // Retrieve for substantive queries (>12 chars) or those with memory triggers
    return hasMemoryTrigger || (userMessage.length > 12 && !query.includes('thank'))
  }

  /**
   * Call a small, fast LLM for RAGate binary decisions
   * Uses minimal tokens for cost efficiency
   */
  private async callRAGateJudge(prompt: string): Promise<string> {
    // This will use your existing AI service infrastructure
    // Using a fast, cheap model for binary decisions
    
    const ragatePayload = {
      message: prompt,
      persona: {
        name: "RAGate Judge",
        personality: { core: "Binary decision maker for memory retrieval" },
        knowledge: { topics: {}, backstory: "" },
        behavior: { conversationStyle: "precise", defaultMood: "analytical" }
      },
      provider: 'google', // Use Google Gemini 1.5 Flash for RAGate
      model: 'gemini-1.5-flash', // Fast, smart binary decisions
      history: []
    }

    // Use the configured AI service URL
    const aiServiceUrl = this.config.aiServiceUrl
    
    try {
      const response = await fetch(aiServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ragatePayload)
      })

      if (!response.ok) {
        throw new Error(`RAGate service responded with status ${response.status}`)
      }

      const data = await response.json()
      return data.reply || 'YES' // Default to retrieving memories if unclear
      
    } catch (error) {
      console.warn('RAGate judge failed:', error)
      throw error
    }
  }

  /**
   * Compress memories using LongLLMLingua-inspired techniques
   * 
   * Implements Retrieve -> Re-rank -> Compress pattern
   */
  private async compressMemories(
    contextResult: ContextResult,
    userQuery: string
  ): Promise<CompressedMemory[]> {
    
    if (contextResult.relevantDocuments.length === 0) {
      return []
    }

    // Re-rank by relevance and limit to top memories
    const topMemories = contextResult.relevantDocuments
      .filter(result => result.relevanceScore >= this.config.relevanceThreshold)
      .slice(0, this.config.maxMemories)

    // Compressing ${topMemories.length} memories

    // Compress each memory
    const compressedMemories: CompressedMemory[] = []
    
    for (const result of topMemories) {
      const original = result.document
      const originalContent = `${original.title}\n${original.summary}\n${original.content}`
      const originalLength = originalContent.length
      
      // Simple but effective compression: Extract most relevant sentences
      const compressedContent = this.extractRelevantContent(
        originalContent,
        userQuery,
        this.config.maxTokensPerMemory * 4 // Rough chars per token estimate
      )
      
      compressedMemories.push({
        title: original.title,
        content: compressedContent,
        relevanceScore: result.relevanceScore,
        originalLength,
        compressedLength: compressedContent.length
      })
    }

    return compressedMemories
  }

  /**
   * Extract most relevant content using simple but effective techniques
   */
  private extractRelevantContent(
    content: string,
    query: string,
    maxLength: number
  ): string {
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
    const queryWords = query.toLowerCase().split(/\s+/)
    
    // Add synonyms for better matching
    const expandedQueryWords = [...queryWords]
    if (queryWords.includes('ship')) {
      expandedQueryWords.push('vessel', 'craft', 'spacecraft')
    }
    if (queryWords.includes('crew') || queryWords.includes('people')) {
      expandedQueryWords.push('team', 'personnel', 'members')
    }
    if (queryWords.includes('work') || queryWords.includes('job')) {
      expandedQueryWords.push('mission', 'assignment', 'operation')
    }
    
    // Score sentences by query relevance
    const scoredSentences = sentences.map(sentence => {
      const sentenceLower = sentence.toLowerCase()
      let score = 0
      
      // Score for query word matches
      expandedQueryWords.forEach(word => {
        if (sentenceLower.includes(word)) {
          score += (queryWords.includes(word) ? 2 : 1) // Original words score higher
        }
      })
      
      // Bonus for sentences with proper nouns (likely names)
      const properNounMatches = sentence.match(/[A-Z][a-z]+/g) || []
      score += properNounMatches.length * 0.5
      
      // DEBUG: Log sentence scoring for pickles-related content
      if (sentenceLower.includes('pickle') || sentenceLower.includes('no pickle')) {
        console.log(`🥒 DEBUGGING Pickle Sentence Score:`, {
          sentence: sentence.substring(0, 100) + '...',
          score,
          matchedWords: expandedQueryWords.filter(word => sentenceLower.includes(word)),
          query: query.substring(0, 50) + '...'
        })
      }
      
      return {
        sentence: sentence.trim(),
        score,
        length: sentence.length
      }
    })

    // Select highest scoring sentences that fit within maxLength
    scoredSentences.sort((a, b) => b.score - a.score)
    
    let result = ''
    let totalLength = 0
    
    // First pass: Add high-scoring sentences, prioritizing important protocols
    const sortedSentences = [...scoredSentences].sort((a, b) => {
      // Prioritize sentences with important protocol keywords
      const aHasProtocol = /protocol|safety|emergency|procedure|no pickles/i.test(a.sentence)
      const bHasProtocol = /protocol|safety|emergency|procedure|no pickles/i.test(b.sentence)
      
      if (aHasProtocol && !bHasProtocol) return -1
      if (!aHasProtocol && bHasProtocol) return 1
      return b.score - a.score // Then sort by score
    })
    
    for (const item of sortedSentences) {
      if (item.score > 0 && totalLength + item.length <= maxLength) {
        result += item.sentence + '. '
        totalLength += item.length
      }
    }
    
    // If we have space, try to add context sentences that mention key query terms
    if (totalLength < maxLength * 0.8) {
      for (const item of scoredSentences) {
        if (item.score === 0 && totalLength + item.length <= maxLength) {
          // Check if this sentence provides useful context to already selected content
          const hasContextualValue = queryWords.some(word => 
            item.sentence.toLowerCase().includes(word.substring(0, 4)) // Partial matches
          )
          if (hasContextualValue) {
            result += item.sentence + '. '
            totalLength += item.length
          }
        }
      }
    }

    return result.trim() || content.substring(0, maxLength)
  }

  /**
   * Create conversation summary for short-term memory
   */
  private createConversationSummary(
    history: Array<{role: string, content: string}>
  ): string {
    
    if (history.length === 0) return ''
    
    // Keep last 3 exchanges for immediate context
    const recentHistory = history.slice(-6) // Last 3 user-assistant pairs
    
    return recentHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')
  }

  /**
   * Create base character context (always included)
   */
  private createBaseCharacterContext(personality: NPCPersonality): string {
    return `You are ${personality.name}, ${personality.personality.core}`
  }

  /**
   * Create enhanced character context with selected memories
   */
  private createEnhancedCharacterContext(
    personality: NPCPersonality,
    memories: CompressedMemory[]
  ): string {
    
    let context = this.createBaseCharacterContext(personality)
    
    if (memories.length > 0) {
      context += '\n\nRELEVANT MEMORIES:\n'
      context += memories
        .map(memory => `- ${memory.title}: ${memory.content}`)
        .join('\n')
    }
    
    return context
  }

  /**
   * Estimate token count for pricing/limits
   */
  private estimateTokens(
    memories: CompressedMemory[],
    summary: string,
    context: string
  ): number {
    
    const totalChars = memories.reduce((acc, mem) => acc + mem.content.length, 0)
      + summary.length 
      + context.length
    
    // Rough estimate: 4 characters per token
    return Math.ceil(totalChars / 4)
  }

  /**
   * Get the configured response token limit
   */
  getResponseTokenLimit(): number {
    return this.config.maxResponseTokens
  }

  /**
   * Build enhanced persona for Cloudflare Worker
   * 
   * This creates the enhanced persona object that your worker already supports
   */
  buildEnhancedPersona(
    personality: NPCPersonality,
    memoryBundle: MemoryBundle
  ): any {
    
    // Build enhanced persona compatible with your existing worker
    const enhancedPersona = {
      ...personality,
      worldKnowledge: {
        contextualMemories: memoryBundle.relevantMemories.map(memory => ({
          topic: memory.title,
          content: memory.content,
          relevance: memory.relevanceScore,
          type: 'compressed_memory'
        }))
      },
      contextualAwareness: memoryBundle.shouldUseMemories 
        ? `\n\nRELEVANT MEMORIES FROM YOUR PAST:\n${memoryBundle.relevantMemories
            .map(m => `- ${m.title}: ${m.content}`)
            .join('\n')}\n\nUse this knowledge naturally in conversation.`
        : undefined
    }

    // Debug logging to see what memories are being passed to AI
    if (memoryBundle.relevantMemories.length > 0) {
      const totalTokens = memoryBundle.totalTokensEstimate
      const memoryDetails = memoryBundle.relevantMemories.map(m => ({ 
        title: m.title, 
        relevance: m.relevanceScore,
        tokens: Math.ceil(m.content.length / 4),
        compression: `${Math.round((1 - m.compressedLength/m.originalLength) * 100)}%`
      }))
      console.log(`💭 Passing ${memoryBundle.relevantMemories.length} memories to ${personality.name} (${totalTokens} tokens):`, memoryDetails)
    }

    return enhancedPersona
  }
}

// Singleton instance
export const memoryManager = new MemoryManagerAgent()