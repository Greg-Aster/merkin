/**
 * MEGAMEAL NPC Conversation Stores
 * 
 * Reactive state management for the conversation system
 * Integrates with existing game state architecture
 */

import { writable, readable, derived, get } from 'svelte/store'
import type {
  ConversationSession,
  ConversationUIState,
  ConversationUIConfig,
  NPCPersonality,
  NPCConversationComponent,
  ConversationStores,
  ConversationSystemConfig
} from './types'
import { ConversationManager } from './ConversationManager'

// ================================
// Configuration
// ================================

const defaultConfig: ConversationSystemConfig = {
  // AI Service (uses existing Bleepy AI worker)
  aiServiceUrl: 'https://megameal-room-directory.greggles.workers.dev',
  aiProvider: 'gemini',
  maxRetries: 3,
  timeout: 30000, // Increased for DeepSeek and large payloads
  
  // Conversation limits
  maxSessionLength: 50,
  sessionTimeout: 10, // 10 minutes
  maxConcurrentSessions: 3,
  
  // Memory & persistence
  enablePersistence: true,
  maxStoredSessions: 10,
  memoryDecayRate: 0.1,
  
  // Performance
  enableCaching: true,
  cacheTimeout: 300000, // 5 minutes
  batchRequestDelay: 100,
  
  // Debug
  enableLogging: import.meta.env.DEV,
  enableDebugUI: import.meta.env.DEV
}

// ================================
// Core Stores
// ================================

// Active conversation session
const activeConversationSession = writable<ConversationSession | null>(null)

// UI State
const conversationUIState = writable<ConversationUIState>({
  isVisible: false,
  isTyping: false,
  npcEmotion: 'neutral',
  position: 'bottom',
  size: 'normal',
  theme: 'mystical'
})

// UI Configuration
const conversationUIConfig = writable<ConversationUIConfig>({
  showTypingIndicator: true,
  autoCloseDelay: 180000, //  3 minutes 
  maxMessagesVisible: 10,
  enableScrollback: true,
  showEmotions: true,
  enableVoice: false
})

// System state
const availableNPCs = writable<Map<string, NPCPersonality>>(new Map())
const nearbyNPCs = writable<NPCConversationComponent[]>([])
const isProcessingResponse = writable<boolean>(false)

// Conversation history (persisted)
const conversationHistory = writable<Map<string, ConversationSession[]>>(new Map())

// System configuration
const conversationConfig = writable<ConversationSystemConfig>(defaultConfig)

// ================================
// Conversation Manager Instance
// ================================

let conversationManager: ConversationManager | null = null

// Initialize conversation manager when config is available
conversationConfig.subscribe(config => {
  if (conversationManager) {
    conversationManager.dispose()
  }
  conversationManager = new ConversationManager(config)
  
  // Set up event handlers
  setupConversationEventHandlers()
})

// ================================
// Derived Stores
// ================================

// Current conversation messages
const currentMessages = derived(
  activeConversationSession,
  ($session) => $session?.messages || []
)

// Is conversation active
const isConversationActive = derived(
  activeConversationSession,
  ($session) => $session?.isActive || false
)

// Current NPC personality
const currentNPCPersonality = derived(
  [activeConversationSession, availableNPCs],
  ([$session, $npcs]) => {
    if (!$session) return null
    return $npcs.get($session.npcId) || null
  }
)

// Conversation statistics
const conversationStats = derived(
  [conversationHistory, activeConversationSession],
  ([$history, $session]) => {
    const totalSessions = Array.from($history.values()).reduce((sum, sessions) => sum + sessions.length, 0)
    const totalMessages = Array.from($history.values()).reduce((sum, sessions) => 
      sum + sessions.reduce((msgSum, session) => msgSum + session.messages.length, 0), 0
    )
    
    return {
      totalSessions,
      totalMessages,
      activeSessionId: $session?.id || null,
      activeSince: $session?.startTime || null
    }
  }
)

// ================================
// Action Creators
// ================================

export const conversationActions = {
  // Start a new conversation
  async startConversation(
    npcId: string,
    personality: NPCPersonality,
    context: any
  ): Promise<ConversationSession | null> {
    if (!conversationManager) {
      console.error('Conversation manager not initialized')
      return null
    }

    try {
      const session = await conversationManager.startConversation(npcId, personality, context)
      if (import.meta.env.DEV) console.log('🗣️ Starting conversation:', session.id)
      activeConversationSession.set(session)
      
      // Update UI state
      conversationUIState.update(state => ({
        ...state,
        isVisible: true,
        npcEmotion: personality.behavior.defaultMood,
        theme: getThemeForNPC(personality)
      }))
      
      return session
    } catch (error) {
      console.error('Failed to start conversation:', error)
      return null
    }
  },

  // Start a read-only conversation for generic fireflies
  startReadOnlyConversation(
    npcId: string,
    personality: any,
    message: string,
    duration: number = 4000
  ): void {
    // Add the personality to availableNPCs so the derived store can find it
    availableNPCs.update(npcs => {
      const newNPCs = new Map(npcs)
      newNPCs.set(npcId, personality)
      return newNPCs
    })
    
    // Create a mock session for read-only mode
    const mockSession = {
      id: `readonly_${npcId}_${Date.now()}`,
      npcId,
      isActive: true,
      startedAt: Date.now(),
      messages: []
    }
    
    activeConversationSession.set(mockSession)
    
    // Set up UI for read-only mode
    conversationUIState.update(state => ({
      ...state,
      isVisible: true,
      isReadOnly: true,
      readOnlyText: message,
      readOnlyDuration: duration,
      npcEmotion: 'peaceful',
      theme: 'firefly'
    }))
    
    if (import.meta.env.DEV) console.log('🗣️ Starting read-only conversation:', mockSession.id)
  },

  // End current conversation
  async endConversation(): Promise<void> {
    const session = get(activeConversationSession)
    if (!session || !conversationManager) return

    await conversationManager.endConversation(session.id)
    
    activeConversationSession.set(null)
    conversationUIState.update(state => ({
      ...state,
      isVisible: false,
      isTyping: false,
      isReadOnly: false,
      readOnlyText: '',
      readOnlyDuration: 4000
    }))
  },

  // Send a message
  async sendMessage(message: string): Promise<void> {
    const session = get(activeConversationSession);

    if (!session || !conversationManager) {
        console.error('Cannot send message: missing session or manager');
        return;
    }

    // FIX: Get personality directly from the session, no more fragile lookup.
    const personality = session.personality; 

    if (!personality) {
        console.error(`Cannot send message: personality is missing from the active session for npcId "${session.npcId}"`);
        return;
    }

    isProcessingResponse.set(true);
    conversationUIState.update(state => ({ ...state, isTyping: true }));

    try {
        const response = await conversationManager.sendMessage(session.id, message, personality);

        // The manager has already updated its internal session state.
        // We just need to add the new message to our local store's session to update the UI.
        activeConversationSession.update(currentSession => {
          if (currentSession && currentSession.id === session.id) {
              // The manager already added the user message. We only need to add the AI response.
              // To prevent duplicates, let's just use the full, updated list from the manager.
              const managerSession = conversationManager.getActiveSession(session.id);
              if (managerSession) {
                  currentSession.messages = managerSession.messages;
              }
              return { ...currentSession }; // Return a new object to trigger reactivity
          }
          return currentSession;
      });

        // Update UI based on response emotion
        if (response.metadata?.emotion) {
            conversationUIState.update(state => ({
                ...state,
                npcEmotion: response.metadata!.emotion!
            }));
        }

    } catch (error) {
        console.error('Failed to send message:', error);
    } finally {
        isProcessingResponse.set(false);
        conversationUIState.update(state => ({ ...state, isTyping: false }));
    }
},

  // Update UI state
  updateUIState(updates: Partial<ConversationUIState>): void {
    conversationUIState.update(state => ({ ...state, ...updates }))
  },

  // Update UI config
  updateUIConfig(updates: Partial<ConversationUIConfig>): void {
    conversationUIConfig.update(config => ({ ...config, ...updates }))
  },

  // Register an NPC
  registerNPC(npc: NPCConversationComponent): void {
    availableNPCs.update(npcs => {
      const newNPCs = new Map(npcs)
      newNPCs.set(npc.npcId, npc.personality)
      return newNPCs
    })

    // Add to nearby NPCs if interactable
    if (npc.isInteractable) {
      nearbyNPCs.update(nearby => [...nearby, npc])
    }
  },

  // Unregister an NPC
  unregisterNPC(npcId: string): void {
    availableNPCs.update(npcs => {
      const newNPCs = new Map(npcs)
      newNPCs.delete(npcId)
      return newNPCs
    })

    nearbyNPCs.update(nearby => nearby.filter(npc => npc.npcId !== npcId))
  },

  // Update NPC interaction state
  updateNPCInteraction(npcId: string, isInteractable: boolean): void {
    nearbyNPCs.update(nearby => 
      nearby.map(npc => 
        npc.npcId === npcId 
          ? { ...npc, isInteractable }
          : npc
      )
    )
  },

  // Clear all conversations (for level transitions, etc.)
  clearAllConversations(): Promise<void[]> {
    const activeSessions = conversationManager?.getAllActiveSessions() || []
    const promises = activeSessions.map(session => 
      conversationManager!.endConversation(session.id)
    )
    
    activeConversationSession.set(null)
    conversationUIState.update(state => ({
      ...state,
      isVisible: false,
      isTyping: false
    }))
    
    return Promise.all(promises)
  },

  // Get conversation history for an NPC
  getNPCHistory(npcId: string): ConversationSession[] {
    if (!conversationManager) return []
    return conversationManager.getSessionHistory(npcId)
  },

  // Update system configuration
  updateConfig(updates: Partial<ConversationSystemConfig>): void {
    conversationConfig.update(config => ({ ...config, ...updates }))
  }
}

// ================================
// Event Handlers
// ================================

function setupConversationEventHandlers(): void {
  if (!conversationManager) return

  // Handle conversation events
  conversationManager.on('conversation_started', (event) => {
    if (event.type === 'conversation_started' && import.meta.env.DEV) {
      console.log(`🗣️ Conversation started with ${event.data.npcId}`)
    }
  })

  conversationManager.on('conversation_ended', (event) => {
    if (event.type === 'conversation_ended' && import.meta.env.DEV) {
      console.log(`🏁 Conversation ended with ${event.data.npcId}`)
      
      // Update conversation history
      conversationHistory.update(history => {
        const newHistory = new Map(history)
        const npcHistory = newHistory.get(event.data.npcId) || []
        const session = conversationManager!.getActiveSession(event.data.sessionId)
        
        if (session) {
          npcHistory.push(session)
          newHistory.set(event.data.npcId, npcHistory)
        }
        
        return newHistory
      })
    }
  })

  conversationManager.on('emotion_changed', (event) => {
    if (event.type === 'emotion_changed') {
      conversationUIState.update(state => ({
        ...state,
        npcEmotion: event.data.emotion
      }))
    }
  })

  conversationManager.on('error', (event) => {
    if (event.type === 'error') {
      console.error('Conversation error:', event.data.error)
      
      // Reset processing state on error
      isProcessingResponse.set(false)
      conversationUIState.update(state => ({ ...state, isTyping: false }))
    }
  })
}

// ================================
// Utility Functions
// ================================

function getThemeForNPC(personality: NPCPersonality): ConversationUIState['theme'] {
  const species = personality.species?.toLowerCase() || ''
  
  if (species.includes('firefly') || species.includes('light')) {
    return 'mystical'
  } else if (species.includes('nature') || species.includes('forest')) {
    return 'nature'
  } else if (species.includes('cosmic') || species.includes('star')) {
    return 'cosmic'
  }
  
  return 'game'
}

// ================================
// Persistence (Optional)
// ================================

// Save conversation history to localStorage
export function saveConversationHistory(): void {
  const history = get(conversationHistory)
  const serializedHistory = JSON.stringify(Array.from(history.entries()))
  localStorage.setItem('megameal_conversation_history', serializedHistory)
}

// Load conversation history from localStorage
export function loadConversationHistory(): void {
  try {
    const saved = localStorage.getItem('megameal_conversation_history')
    if (saved) {
      const parsed = JSON.parse(saved)
      const historyMap = new Map<string, ConversationSession[]>(parsed)
      conversationHistory.set(historyMap)
    }
  } catch (error) {
    console.warn('Failed to load conversation history:', error)
  }
}

// Auto-save conversation history periodically
if (typeof window !== 'undefined') {
  setInterval(saveConversationHistory, 60000) // Save every minute
  
  // Load on initialization
  loadConversationHistory()
  
  // Save on page unload
  window.addEventListener('beforeunload', saveConversationHistory)
}

// ================================
// Store Bundle Export
// ================================

export const conversationStores: ConversationStores = {
  activeSession: activeConversationSession,
  uiState: conversationUIState,
  uiConfig: conversationUIConfig,
  availableNPCs: readable(get(availableNPCs), (set) => {
    return availableNPCs.subscribe(set)
  }),
  conversationHistory: readable(get(conversationHistory), (set) => {
    return conversationHistory.subscribe(set)
  }),
  nearbyNPCs: readable(get(nearbyNPCs), (set) => {
    return nearbyNPCs.subscribe(set)
  }),
  isProcessingResponse: readable(get(isProcessingResponse), (set) => {
    return isProcessingResponse.subscribe(set)
  })
}

// Export individual stores for convenience
export {
  activeConversationSession,
  conversationUIState,
  conversationUIConfig,
  availableNPCs,
  nearbyNPCs,
  isProcessingResponse,
  conversationHistory,
  conversationConfig,
  currentMessages,
  isConversationActive,
  currentNPCPersonality,
  conversationStats
}

// Export the conversation manager getter
export const getConversationManager = (): ConversationManager | null => conversationManager