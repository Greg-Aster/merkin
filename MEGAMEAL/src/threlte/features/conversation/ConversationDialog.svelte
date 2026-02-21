<!--
  MEGAMEAL Enhanced Conversation Dialog
  
  Modern conversation UI component that replaces the basic DialogueBox
  Supports AI-powered conversations with rich interactions
-->

<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'
  import { slide, fade, fly } from 'svelte/transition'
  import { quintOut } from 'svelte/easing'
  import {
    conversationUIState,
    conversationUIConfig,
    currentMessages,
    isConversationActive,
    currentNPCPersonality,
    isProcessingResponse,
    conversationActions,
    activeConversationSession
  } from './conversationStores'
  import type { NPCEmotion } from './types'
  import FireflyAvatar from './FireflyAvatar.svelte'

  const dispatch = createEventDispatcher()

  // Component props
  export let visible: boolean = false
  export let position: 'bottom' | 'centered' | { x: number; y: number } = 'bottom'
  export let maxWidth: number = 700
  export let maxHeight: number = 500
  
  // Read-only mode can be passed as props or from UI state
  export let readOnly: boolean = false
  export let readOnlyText: string = ''
  export let readOnlyDuration: number = 8000

  // Local state
  let dialogContainer: HTMLElement
  let messageContainer: HTMLElement
  let messageInput: HTMLInputElement
  let currentMessage = ''
  let isTypingMessage = false
  let autoCloseTimer: ReturnType<typeof setTimeout> | null = null
  let isUserScrolledUp = false
  let lastMessageCount = 0

  // Reactive state
  $: messages = $currentMessages
  $: npcPersonality = $currentNPCPersonality
  $: uiState = $conversationUIState
  $: uiConfig = $conversationUIConfig
  $: isActive = $isConversationActive
  $: isProcessing = $isProcessingResponse
  $: session = $activeConversationSession
  
  // Use UI state values for read-only mode when available
  $: effectiveReadOnly = readOnly || uiState.isReadOnly || false
  $: effectiveReadOnlyText = readOnlyText || uiState.readOnlyText || ''
  $: effectiveReadOnlyDuration = readOnlyDuration || uiState.readOnlyDuration || 4000
  
  // Debug logging
  $: console.log('🔍 ConversationDialog - visible:', visible, 'isActive:', isActive, 'shouldShow:', visible && isActive)

  // Smart auto-scroll: Only scroll to bottom for new messages if user hasn't scrolled up
  $: if (messageContainer && messages.length > lastMessageCount) {
    if (!isUserScrolledUp) {
      setTimeout(() => {
        if (messageContainer && !isUserScrolledUp) {
          messageContainer.scrollTop = messageContainer.scrollHeight
        }
      }, 100)
    }
    lastMessageCount = messages.length
  }

  // Auto-close timer - only if not typing
  $: if (visible && uiConfig.autoCloseDelay && uiConfig.autoCloseDelay > 0 && !isTypingMessage) {
    setupAutoClose()
  }
  
  // Read-only mode auto-dismiss
  $: if (visible && effectiveReadOnly && effectiveReadOnlyDuration > 0) {
    setupReadOnlyAutoClose()
  }

  // Position calculation
  $: positionStyles = calculatePosition(position)

  // Theme-based styles
  $: themeClass = `theme-${uiState.theme}`
  
  // Get firefly visual properties from personality or session
  $: fireflyColor = getFireflyColor(npcPersonality || session?.personality)
  
  function getFireflyColor(personality: any): string {
    // Default firefly colors from HybridFireflyComponent
    const fireflyColors = ['#87ceeb', '#98fb98', '#ffffe0', '#dda0dd', '#f0e68c', '#ffa07a', '#20b2aa', '#9370db']
    
    if (personality?.visual?.primaryColor) {
      return personality.visual.primaryColor
    }
    
    // Use personality ID to consistently pick same color for same firefly
    if (personality?.id && typeof personality.id === 'string') {
      const hash = personality.id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return a & a
      }, 0)
      return fireflyColors[Math.abs(hash) % fireflyColors.length]
    }
    
    return fireflyColors[0] // Default to sky blue
  }

  function isAtBottom(container: HTMLElement): boolean {
    // Consider "at bottom" if within 50px of the bottom
    const threshold = 50
    return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold
  }

  function handleScroll(): void {
    if (messageContainer) {
      isUserScrolledUp = !isAtBottom(messageContainer)
    }
  }

  function calculatePosition(pos: typeof position): string {
    if (pos === 'bottom') {
      return 'bottom: 2rem; left: 50%; transform: translateX(-50%);'
    } else if (pos === 'centered') {
      return 'top: 50%; left: 50%; transform: translate(-50%, -50%);'
    } else if (typeof pos === 'object') {
      return `top: ${pos.y}px; left: ${pos.x}px;`
    }
    return 'bottom: 2rem; left: 50%; transform: translateX(-50%);'
  }

  function setupAutoClose(): void {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
    }
    
    autoCloseTimer = setTimeout(() => {
      if (visible && !isProcessing) {
        handleClose()
      }
    }, uiConfig.autoCloseDelay)
  }

  function resetAutoClose(): void {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
      autoCloseTimer = null
    }
    if (uiConfig.autoCloseDelay && uiConfig.autoCloseDelay > 0) {
      setupAutoClose()
    }
  }

  function setupReadOnlyAutoClose(): void {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
    }
    
    autoCloseTimer = setTimeout(() => {
      if (visible && effectiveReadOnly) {
        handleClose()
      }
    }, effectiveReadOnlyDuration)
  }

  async function handleSendMessage(): Promise<void> {
    if (!currentMessage.trim() || isProcessing || !isActive) return

    const message = currentMessage.trim()
    currentMessage = ''
    
    resetAutoClose()

    try {
      await conversationActions.sendMessage(message)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  function handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    } else if (event.key === 'Escape') {
      handleClose()
    }
  }

  // Handle input changes to track typing state
  function handleInputChange(): void {
    isTypingMessage = currentMessage.length > 0
    resetAutoClose()
  }

  // Auto-focus input after NPC response
  $: if (messages.length > 0 && messageInput && !isProcessing) {
    setTimeout(() => {
      if (messageInput && !isProcessing) {
        messageInput.focus()
      }
    }, 100)
  }

  function handleClose(): void {
    dispatch('close')
    conversationActions.endConversation()
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  function getEmotionEmoji(emotion: NPCEmotion): string {
    const emojiMap: Record<NPCEmotion, string> = {
      neutral: '😐',
      happy: '😊',
      excited: '🤩',
      curious: '🤔',
      thoughtful: '💭',
      sad: '😢',
      worried: '😟',
      surprised: '😲',
      confused: '😕',
      mysterious: '🌟',
      playful: '😄',
      wise: '🧙',
      mischievous: '😏',
      peaceful: '😌',
      energetic: '⚡'
    }
    return emojiMap[emotion] || '🌟'
  }

  function getEmotionColor(emotion: NPCEmotion): string {
    const colorMap: Record<NPCEmotion, string> = {
      neutral: '#8892b0',
      happy: '#64ffda',
      excited: '#ff6b6b',
      curious: '#4ecdc4',
      thoughtful: '#a8e6cf',
      sad: '#87ceeb',
      worried: '#dda0dd',
      surprised: '#ffb347',
      confused: '#f0e68c',
      mysterious: '#9370db',
      playful: '#ff69b4',
      wise: '#daa520',
      mischievous: '#ff1493',
      peaceful: '#98fb98',
      energetic: '#ffd700'
    }
    return colorMap[emotion] || '#64ffda'
  }

  function getDisplayName(fullName: string, species: string): string {
    // For fireflies, show only first name for intimacy
    if (species?.toLowerCase().includes('firefly')) {
      return fullName?.split(' ')[0] || fullName || 'Unknown'
    }
    // For non-fireflies, show full name
    return fullName || 'Unknown'
  }

  // Reset scroll state when conversation changes
  $: if (session?.id) {
    isUserScrolledUp = false
    lastMessageCount = 0
  }

  // Lifecycle
  onMount(() => {
    if (messageInput) {
      messageInput.focus()
    }
  })

  onDestroy(() => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
    }
  })
</script>

{#if (visible && isActive) || (visible && effectiveReadOnly)}
  <!-- Click-away backdrop -->
  <div 
    class="dialog-backdrop"
    transition:fade={{ duration: 200 }}
    on:click={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    tabindex="-1"
    role="button"
    aria-label="Close conversation"
  />
  
  <div 
    class="conversation-dialog {themeClass}"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
    style="{positionStyles} max-width: {maxWidth}px; max-height: {maxHeight}px; z-index: 99999 ;"
    bind:this={dialogContainer}
    on:click|stopPropagation
    on:keydown|stopPropagation
  >
    <!-- Header -->
    <div class="dialog-header">
      <div class="npc-info">
        {#if (npcPersonality || session?.personality)?.species?.toLowerCase().includes('firefly')}
          <div class="firefly-avatar-container">
            <FireflyAvatar 
              color={fireflyColor}
              size={32}
              intensity={1.2}
              animate={true}
            />
          </div>
        {:else if uiConfig.showEmotions && uiState.npcEmotion}
          <span class="emotion-indicator" style="color: {getEmotionColor(uiState.npcEmotion)}">
            {getEmotionEmoji(uiState.npcEmotion)}
          </span>
        {/if}
        <div class="npc-details">
          <h3 class="npc-name">{getDisplayName(npcPersonality?.name || session?.personality?.name, npcPersonality?.species || session?.personality?.species)}</h3>
          {#if npcPersonality?.species || session?.personality?.species}
            <p class="npc-species">{npcPersonality?.species || session?.personality?.species}</p>
          {/if}
        </div>
      </div>
      
      <button 
        class="close-button"
        on:click={handleClose}
        aria-label="Close conversation"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Messages -->
    {#if effectiveReadOnly}
      <!-- Read-only content for generic fireflies -->
      <div class="messages-container read-only">
        <div class="message npc" transition:fade={{ duration: 200 }}>
          <div class="message-content">
            <div class="message-text">
              {effectiveReadOnlyText}
            </div>
            <div class="message-meta">
              <span class="read-only-hint">Click to dismiss</span>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <!-- Regular conversation messages -->
      <div 
        class="messages-container"
        bind:this={messageContainer}
        on:scroll={handleScroll}
      >
        {#each messages as message (message.id)}
          <div 
            class="message {message.role}"
            transition:fade={{ duration: 200 }}
          >
            <div class="message-content">
              <div class="message-text">
                {message.content}
              </div>
              <div class="message-meta">
                <span class="timestamp">{formatTimestamp(message.timestamp)}</span>
                {#if message.metadata?.emotion && uiConfig.showEmotions}
                  <!-- <span class="message-emotion" style="color: {getEmotionColor(message.metadata.emotion)}">
                    {getEmotionEmoji(message.metadata.emotion)}
                  </span> -->
                {/if}
              </div>
            </div>
          </div>
        {/each}

        <!-- Typing indicator -->
        {#if isProcessing && uiConfig.showTypingIndicator}
          <div class="message npc typing" transition:fade={{ duration: 200 }}>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Input area (only show for conversational fireflies) -->
    {#if !effectiveReadOnly}
      <div class="input-area">
        <div class="input-wrapper">
          <input
            bind:this={messageInput}
            bind:value={currentMessage}
            on:keydown={handleKeyPress}
            on:input={handleInputChange}
            placeholder="Type your message..."
            disabled={isProcessing}
            class="message-input"
            maxlength="500"
          />
          <button
            on:click={handleSendMessage}
            disabled={!currentMessage.trim() || isProcessing}
            class="send-button"
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
            </svg>
          </button>
        </div>
        
        <div class="input-hints">
          <span class="character-count">{currentMessage.length}/500</span>
          <span class="hint">Enter to send • Esc to close</span>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99998;
    background: transparent;
    cursor: pointer;
  }

  .conversation-dialog {
    position: fixed;
    z-index: 99999;
    display: flex; /* <-- ADD THIS */
    flex-direction: column; /* <-- ADD THIS */
    background: rgba(15, 23, 42, 0.95);
    border: 2px solid var(--primary-color, #64ffda);
    border-radius: 16px;
    backdrop-filter: blur(10px);
    box-shadow: 
      0 25px 50px -12px rgba(0, 0, 0, 0.8),
      0 0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    overflow: hidden;
    font-family: 'Segoe UI', system-ui, sans-serif;
    min-width: 320px;
    animation: dialogGlow 2s ease-in-out infinite alternate;
  }

  @keyframes dialogGlow {
    0% { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(100, 255, 218, 0.3); }
    100% { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(100, 255, 218, 0.5); }
  }

  /* Theme variations */
  .theme-mystical {
    --primary-color: #9370db;
    --accent-color: #dda0dd;
    --text-color: #e2e8f0;
  }

  .theme-nature {
    --primary-color: #32cd32;
    --accent-color: #98fb98;
    --text-color: #f0fff0;
  }

  .theme-cosmic {
    --primary-color: #4169e1;
    --accent-color: #87ceeb;
    --text-color: #f0f8ff;
  }

  .theme-game {
    --primary-color: #64ffda;
    --accent-color: #80ffdb;
    --text-color: #e2e8f0;
  }

  /* Header */
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
  }

  .npc-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .firefly-avatar-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(5px);
    animation: fireflyPulse 3s ease-in-out infinite;
  }
  
  @keyframes fireflyPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(135, 206, 235, 0.3); }
    50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(135, 206, 235, 0.6); }
  }

  .emotion-indicator {
    font-size: 1.5rem;
    filter: drop-shadow(0 0 8px currentColor);
    animation: emotionPulse 2s ease-in-out infinite;
  }

  @keyframes emotionPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .npc-details h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .npc-details p,
  .npc-species {
    margin: 0;
    font-size: 0.85rem;
    color: var(--accent-color, #64ffda);
    opacity: 0.8;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--text-color);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.2s ease;
    opacity: 0.7;
  }

  .close-button:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }

  /* Messages */
  .messages-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    scrollbar-width: thin;
    scrollbar-color: var(--primary-color) transparent;
    flex: 1;
    min-height: 150px;
  }

  .messages-container::-webkit-scrollbar {
    width: 6px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: 3px;
  }

  .message {
    display: flex;
    animation: messageSlide 0.3s ease-out;
  }

  @keyframes messageSlide {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .message.user {
    justify-content: flex-end;
  }

  .message.npc {
    justify-content: flex-start;
  }

  .message-content {
    max-width: 85%;
    min-width: 200px;
    background: rgba(255, 255, 255, 0.1);
    padding: 0.75rem 1rem;
    border-radius: 12px;
    backdrop-filter: blur(5px);
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .message.user .message-content {
    background: var(--primary-color);
    color: #0f172a;
    margin-left: auto;
  }

  .message.npc .message-content {
    background: rgba(255, 255, 255, 0.15);
    color: var(--text-color);
  }

  .message-text {
    font-size: 0.95rem;
    line-height: 1.5;
    word-wrap: break-word;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    width: 100%;
    hyphens: auto;
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
  }

  .message-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .timestamp {
    color: inherit;
  }

  .message-emotion {
    font-size: 1rem;
  }

  /* Typing indicator */
  .typing .message-content {
    padding: 1rem;
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .typing-indicator span {
    width: 6px;
    height: 6px;
    background: var(--accent-color);
    border-radius: 50%;
    animation: typingBounce 1.4s ease-in-out infinite both;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.16s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.32s;
  }

  @keyframes typingBounce {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40% { transform: scale(1.2); opacity: 1; }
  }

  /* Input area */
  .input-area {
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
  }

  .input-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .message-input {
    flex: 1;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    color: var(--text-color);
    font-size: 0.95rem;
    transition: all 0.2s ease;
  }

  .message-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(100, 255, 218, 0.2);
  }

  .message-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .message-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-button {
    background: var(--primary-color);
    border: none;
    border-radius: 8px;
    padding: 0.75rem;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-button:hover:not(:disabled) {
    background: var(--accent-color);
    transform: scale(1.05);
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .input-hints {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .character-count {
    font-variant-numeric: tabular-nums;
  }

  .hint {
    font-style: italic;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .conversation-dialog {
      left: 1rem !important;
      right: 1rem !important;
      bottom: 1rem !important;
      transform: none !important;
      max-width: none !important;
      min-width: auto !important;
    }
    
    .messages-container {
      max-height: 250px;
      min-height: 120px;
    }
    
    .message-content {
      max-width: 90%;
      min-width: 150px;
    }
    
    .message-text {
      font-size: 0.9rem;
      line-height: 1.4;
    }
  }
  
  /* Read-only mode styles */
  .messages-container.read-only {
    text-align: center;
  }
  
  .read-only-hint {
    color: var(--text-75, #cccccc);
    opacity: 0.7;
    font-style: italic;
    font-size: 0.7rem;
  }
</style>