/**
 * MEGAMEAL NPC Conversation System - Feature Module Entry Point
 * 
 * Modular AI-powered conversation system for NPCs
 * Integrates with existing Bleepy AI service and game architecture
 */

// UI Component
export { default as ConversationDialog } from './ConversationDialog.svelte'

// Core actions and state that other modules need
export {
  conversationActions,
  isConversationActive,
  activeConversationSession,
  conversationUIState
} from './conversationStores'

// Character system
export {
  characterRegistry,
  CharacterComponent,
  getObservatoryContext
} from './characters'

// Key types for external modules
export type {
  ConversationSession,
  NPCPersonality,
  ConversationUIState
} from './types'

// Note: ConversationalFireflyComponent was merged into HybridFireflyComponent
// Use HybridFireflyComponent with enableAIConversations={true} instead

// Re-export commonly used types for convenience
export type {
  ConversationSession,
  ConversationMessage,
  NPCPersonality,
  NPCConversationComponent,
  ConversationUIState,
  NPCEmotion,
  ConversationEvent,
  ConversationSystemConfig
} from './types'

/**
 * Quick Setup Guide for New NPCs:
 * 
 * 1. Create NPC personality:
 *    ```typescript
 *    const myNPCPersonality: NPCPersonality = {
 *      id: 'my_npc',
 *      name: 'My NPC',
 *      // ... other properties
 *    }
 *    ```
 * 
 * 2. Register NPC with conversation system:
 *    ```typescript
 *    import { conversationActions } from '@/threlte/systems/conversation'
 *    
 *    conversationActions.registerNPC({
 *      id: 'my_npc_component',
 *      npcId: 'my_npc',
 *      personality: myNPCPersonality,
 *      isInteractable: true
 *    })
 *    ```
 * 
 * 3. Start conversation on interaction:
 *    ```typescript
 *    await conversationActions.startConversation(
 *      'my_npc',
 *      myNPCPersonality,
 *      context
 *    )
 *    ```
 * 
 * 4. Add ConversationDialog to your level:
 *    ```svelte
 *    <ConversationDialog 
 *      visible={$conversationUIState.isVisible}
 *      on:close={() => conversationActions.endConversation()}
 *    />
 *    ```
 */