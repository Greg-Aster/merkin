/**
 * MEGAMEAL NPC Conversation System - Type Definitions
 * 
 * Modular conversation system for AI-powered NPC interactions
 * Integrates with existing Bleepy AI service and game architecture
 */

import type { Readable, Writable } from 'svelte/store'

// ================================
// Core Conversation Types
// ================================

export interface ConversationMessage {
  id: string
  role: 'user' | 'npc' | 'system'
  content: string
  timestamp: number
  metadata?: {
    emotion?: NPCEmotion
    actionType?: 'greeting' | 'response' | 'farewell' | 'idle'
    visualCue?: string
  }
}

export interface ConversationSession {
  id: string
  npcId: string
  messages: ConversationMessage[]
  startTime: number
  lastInteraction: number
  isActive: boolean
  context: ConversationContext
}

export interface ConversationContext {
  location: string
  timeOfDay: 'day' | 'night' | 'dusk' | 'dawn'
  playerLevel?: string
  gameState?: Record<string, any>
  environmentData?: {
    weather?: string
    season?: string
    ambientNoise?: string
  }
  previousConversations?: number
  relationshipLevel?: number
}

// ================================
// NPC Personality System
// ================================

export interface NPCPersonality {
  id: string
  name: string
  species?: string
  age?: number | string
  
  // Core traits
  personality: {
    core: string // Main personality description
    traits: string[] // Key personality traits
    quirks: string[] // Unique behavioral quirks
    interests: string[] // Topics of interest
    fears?: string[] // Things they're afraid of
    goals?: string[] // Current objectives/desires
  }
  
  // Knowledge & Memory
  knowledge: {
    topics: Record<string, string> // Topic -> knowledge level/content
    memories: string[] // Persistent memories about player/world
    secrets?: string[] // Information they might reveal under conditions
    backstory: string // Rich background story
    openingStatement?: string // First statement when clicked, replaces generic greeting
  }
  
  // Behavioral patterns
  behavior: {
    greetingStyle: 'formal' | 'casual' | 'shy' | 'enthusiastic' | 'mysterious'
    conversationStyle: 'talkative' | 'concise' | 'philosophical' | 'playful' | 'wise'
    emotionalRange: NPCEmotion[]
    defaultMood: NPCEmotion
    speechPatterns?: string[] // Unique ways of speaking
  }
  
  // Visual & interaction
  visual: {
    description: string
    expressions?: Partial<Record<NPCEmotion, string>> // Allow partial emotion coverage
    animations?: Record<string, string>
    visualCues?: Partial<Record<NPCEmotion, string>> // Allow partial emotion coverage
  }
  
  // Conversation parameters
  conversation: {
    maxResponseLength?: number // DEPRECATED: Use MemoryManagerAgent.getResponseTokenLimit() instead
    responseDelay?: number // Milliseconds before responding
    farewellTriggers: string[] // Phrases that end conversation
    topicTransitions: Record<string, string[]> // How to change topics
  }
}

export type NPCEmotion = 
  | 'neutral' | 'happy' | 'excited' | 'curious' | 'thoughtful'
  | 'sad' | 'worried' | 'surprised' | 'confused' | 'mysterious'
  | 'playful' | 'wise' | 'mischievous' | 'peaceful' | 'energetic'

// ================================
// AI Integration
// ================================

export interface AIConversationRequest {
  npcPersonality: NPCPersonality
  conversationHistory: ConversationMessage[]
  userMessage: string
  context: ConversationContext
  responseConstraints: {
    maxLength: number
    style: string
    emotion?: NPCEmotion
    includeAction?: boolean
  }
}

export interface AIConversationResponse {
  content: string
  emotion: NPCEmotion
  confidence: number
  suggestedActions?: ConversationAction[]
  metadata?: {
    topicsDiscussed: string[]
    moodChange?: NPCEmotion
    memoryUpdate?: string
    relationshipDelta?: number
  }
}

export interface ConversationAction {
  type: 'visual' | 'audio' | 'game' | 'ui'
  action: string
  parameters?: Record<string, any>
  delay?: number
}

// ================================
// UI & Interaction
// ================================

export interface ConversationUIState {
  isVisible: boolean
  isTyping: boolean
  npcEmotion: NPCEmotion
  position: { x: number; y: number } | 'centered' | 'bottom'
  size: 'compact' | 'normal' | 'expanded'
  theme: 'game' | 'mystical' | 'nature' | 'cosmic' | 'firefly'
  
  // Read-only mode for generic fireflies
  isReadOnly?: boolean
  readOnlyText?: string  
  readOnlyDuration?: number
}

export interface ConversationUIConfig {
  showTypingIndicator: boolean
  autoCloseDelay?: number // Auto-close after inactivity
  maxMessagesVisible: number
  enableScrollback: boolean
  showEmotions: boolean
  enableVoice?: boolean
  customStyling?: Record<string, string>
}

// ================================
// System Integration
// ================================

export interface NPCConversationComponent {
  id: string
  npcId: string
  personality: NPCPersonality
  isInteractable: boolean
  interactionRadius?: number
  
  // ECS integration
  entityId?: number
  position?: [number, number, number]
  
  // Event handlers
  onConversationStart?: (session: ConversationSession) => void
  onConversationEnd?: (session: ConversationSession) => void
  onMessageReceived?: (message: ConversationMessage) => void
  onEmotionChange?: (emotion: NPCEmotion) => void
}

// ================================
// Store Types
// ================================

export interface ConversationStores {
  // Active conversation state
  activeSession: Writable<ConversationSession | null>
  
  // UI state
  uiState: Writable<ConversationUIState>
  uiConfig: Writable<ConversationUIConfig>
  
  // System state
  availableNPCs: Readable<Map<string, NPCPersonality>>
  conversationHistory: Readable<Map<string, ConversationSession[]>>
  
  // Interaction state
  nearbyNPCs: Readable<NPCConversationComponent[]>
  isProcessingResponse: Readable<boolean>
}

// ================================
// Configuration
// ================================

export interface ConversationSystemConfig {
  // AI Service
  aiServiceUrl: string
  aiProvider: 'gemini' | 'deepseek' | 'openai'
  maxRetries: number
  timeout: number
  
  // Conversation limits
  maxSessionLength: number // Max messages per session
  sessionTimeout: number // Minutes of inactivity before session ends
  maxConcurrentSessions: number
  
  // Memory & persistence
  enablePersistence: boolean
  maxStoredSessions: number
  memoryDecayRate: number // How quickly NPCs "forget" old conversations
  
  // Performance
  enableCaching: boolean
  cacheTimeout: number
  batchRequestDelay: number
  
  // Debug
  enableLogging: boolean
  enableDebugUI: boolean
}

// ================================
// Events
// ================================

export type ConversationEvent = 
  | { type: 'conversation_started'; data: { npcId: string; sessionId: string } }
  | { type: 'conversation_ended'; data: { npcId: string; sessionId: string; duration: number } }
  | { type: 'message_sent'; data: { sessionId: string; message: ConversationMessage } }
  | { type: 'message_received'; data: { sessionId: string; message: ConversationMessage } }
  | { type: 'emotion_changed'; data: { npcId: string; emotion: NPCEmotion; previous: NPCEmotion } }
  | { type: 'relationship_changed'; data: { npcId: string; delta: number; newLevel: number } }
  | { type: 'memory_updated'; data: { npcId: string; memory: string } }
  | { type: 'error'; data: { error: Error; context: string } }

// ================================
// Utility Types
// ================================

export type ConversationEventHandler<T extends ConversationEvent = ConversationEvent> = (event: T) => void

export interface ConversationUtils {
  generateSessionId(): string
  generateMessageId(): string
  calculateRelationshipLevel(interactionCount: number, positiveInteractions: number): number
  formatTimestamp(timestamp: number): string
  extractKeywords(text: string): string[]
  detectEmotion(text: string): NPCEmotion
  generateContextPrompt(personality: NPCPersonality, context: ConversationContext): string
}