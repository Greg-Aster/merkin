/**
 * Runtime-safe conversation contract.
 *
 * Keep this entrypoint free of UI components and character authoring imports so
 * gameplay code can use conversation state without pulling editor-only modules.
 */

export {
  activeConversationSession,
  availableNPCs,
  conversationActions,
  conversationConfig,
  conversationHistory,
  conversationStats,
  conversationStores,
  conversationUIConfig,
  conversationUIState,
  currentMessages,
  currentNPCPersonality,
  getConversationManager,
  isConversationActive,
  isProcessingResponse,
  loadConversationHistory,
  nearbyNPCs,
  saveConversationHistory,
} from './conversationStores'

export type {
  ConversationContext,
  ConversationEvent,
  ConversationMessage,
  ConversationSession,
  ConversationStores,
  ConversationSystemConfig,
  ConversationUIConfig,
  ConversationUIState,
  NPCConversationComponent,
  NPCEmotion,
  NPCPersonality,
} from './types'
