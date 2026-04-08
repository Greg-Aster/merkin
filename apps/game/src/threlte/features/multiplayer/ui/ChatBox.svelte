<script lang="ts">
  import { chatStore } from '../stores/chatStore';
  import { sendChatMessage } from '../services/MultiplayerService';
  import { multiplayerStore } from '../stores/multiplayerStore';
  import { afterUpdate } from 'svelte';
  import { setInputFocus } from '../../../stores/uiStore';
  import { playerNameStore } from '../index';

  // State to control if the chat window is open or closed
  let isExpanded = true;

  let messageInput = '';
  let chatContainer: HTMLElement;
  let inputElement: HTMLInputElement;

  // Auto-scroll to bottom when new messages arrive
  afterUpdate(() => {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });
  function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (messageInput.trim() === '') return;
    
    sendChatMessage(messageInput.trim());
    messageInput = '';
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getFriendlyName(peerId: string) {
    return playerNameStore.getName(peerId);
  }

  // Export function to focus input from parent
  export function focusInput() {
    if (inputElement) {
      if (!isExpanded) isExpanded = true;
      // Allow DOM to update before focusing
      setTimeout(() => inputElement.focus(), 0);
    }
  }
</script>

{#if $multiplayerStore.isConnected}
  <div class="chat-box">
    <!-- Ultra-minimal messages display -->
    {#if isExpanded && $chatStore.length > 0}
      <div class="chat-messages" bind:this={chatContainer}>
        {#each $chatStore.slice(-3) as message (message.timestamp)}
          <div class="message">
            <span class="sender" class:self={message.senderId === $multiplayerStore.peerId}>
              {message.senderId === $multiplayerStore.peerId ? 'You' : getFriendlyName(message.senderId)}:
            </span>
            {message.text}
          </div>
        {/each}
      </div>
    {/if}
    
    <!-- Always visible input -->
    <form class="chat-input" on:submit={handleSubmit}>
      <input 
        type="text" 
        bind:value={messageInput}
        bind:this={inputElement}
        placeholder="" 
        maxlength="200"
        on:focus={() => {setInputFocus(true); isExpanded = true;}}
        on:blur={() => setInputFocus(false)}
      />
      {#if messageInput.trim()}
        <button type="submit">→</button>
      {/if}
    </form>
  </div>
{/if}

<style>
  .chat-box {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    max-width: 600px;
    font-family: sans-serif;
    font-size: 13px;
    color: white;
    z-index: 1000;
  }

  .chat-messages {
    padding: 6px 0;
    margin-bottom: 4px;
  }

  .message {
    padding: 2px 0;
    opacity: 0.9;
    font-size: 12px;
    line-height: 1.3;
  }

  .sender {
    font-weight: 600;
    margin-right: 4px;
  }

  .sender:not(.self) {
    color: #60a5fa;
  }

  .sender.self {
    color: #34d399;
  }

  .chat-input {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .chat-input input {
    flex: 1;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    padding: 8px 12px;
    color: white;
    font-size: 13px;
    outline: none;
    transition: all 0.2s ease;
  }

  .chat-input input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .chat-input input:focus {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.3);
  }

  .chat-input button {
    background: #4f46e5;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    color: white;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .chat-input button:hover {
    background: #4338ca;
    transform: scale(1.05);
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .chat-box {
      bottom: 160px;
      left: 12px;
      right: 12px;
      transform: none;
      width: auto;
    }
    
    .chat-input input {
      font-size: 16px; /* Prevents zoom on iOS */
      padding: 10px 12px;
    }
    
    .message {
      font-size: 11px;
    }
  }
</style>