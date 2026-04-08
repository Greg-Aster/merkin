<script lang="ts">
  import { multiplayerStore } from '../stores/multiplayerStore';
  import { initializeClient, createRoom } from '../services/MultiplayerService';

  let roomNameInput = '';
  
  // A local 'status' variable to track the joining process within this component
  let status: 'idle' | 'joining' = 'idle';
  let joinError = '';

  // This function is called when the user clicks the "Join" button.
  function handleJoinRoom() {
    if (status === 'joining' || !roomNameInput.trim()) return;
    
    status = 'joining';
    joinError = '';
    
    // Call the service, which will handle the lookup and connection.
    // The service will update the global store, and this component will react to it.
    initializeClient(roomNameInput.trim());
    
    // Reset the local status since the service is now handling the process
    // The global store will reflect the actual connection state
    status = 'idle';
  }
</script>

<div class="multiplayer-controls">
  <!-- STATE 1: Connected to a room -->
  {#if $multiplayerStore.isConnected}
    <div class="connected-status">
      <p class="connection-info">✅ Connected  to Room</p>
      <p class="host-info">Host ID: <span class="id-text">{$multiplayerStore.hostId}</span></p>
      <p class="players-info">
        👥 {Object.keys($multiplayerStore.players).length + 1} players connected
      </p>
    </div>

  <!-- STATE 2: Not connected, show initial controls -->
  {:else}
    <!-- Create Room Button -->
    <button class="create-btn" on:click={createRoom}>🚀 Create a New Room</button>
    
    <div class="separator">or</div>

    <!-- Join Room Section -->
    <div class="join-room">
      <input
        type="text"
        bind:value={roomNameInput}
        placeholder="Enter room name to join"
        disabled={status === 'joining'}
        class="room-input"
        on:keypress={(e) => e.key === 'Enter' && handleJoinRoom()}
      />
      
      <button
        class="join-btn"
        on:click={handleJoinRoom}
        disabled={status === 'joining' || !roomNameInput.trim()}
      >
        {#if status === 'joining'}
          ⏳ Joining...
        {:else}
          🔗 Join Room
        {/if}
      </button>
    </div>

    <!-- Show any status or error messages from the store -->
    {#if $multiplayerStore.status && $multiplayerStore.status !== 'Connected!'}
      <div class="status-message">
        {$multiplayerStore.status}
      </div>
    {/if}
    {#if joinError || $multiplayerStore.error}
      <div class="error-message">
        ❌ {joinError || $multiplayerStore.error}
      </div>
    {/if}
  {/if}
</div>

<!-- The CSS styles from the previous version can be reused here without changes. -->
<style>
  .multiplayer-controls {
    position: fixed;
    top: 20px;
    left: 20px;
    background: rgba(25, 25, 28, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    width: 300px;
    z-index: 1000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }
  .create-btn {
    width: 100%; padding: 12px; border: none; border-radius: 8px;
    background: #4f46e5; color: white; font-weight: 600; cursor: pointer;
    font-size: 14px; transition: all 0.2s ease;
  }
  .create-btn:hover { background: #4338ca; }
  .separator {
    text-align: center; color: #777; font-size: 12px;
    margin: 12px 0;
  }
  .join-room { display: flex; flex-direction: column; gap: 8px; }
  .room-input {
    width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #555;
    border-radius: 6px; background: #333; color: white; font-size: 14px;
  }
  .join-btn {
    padding: 10px; border: none; border-radius: 6px; background: #059669;
    color: white; font-weight: 500; cursor: pointer; font-size: 14px;
  }
  .join-btn:disabled { background: #555; cursor: not-allowed; }
  .error-message, .status-message {
    border-radius: 6px; padding: 8px 12px; font-size: 12px; margin-top: 12px;
  }
  .error-message { background: #450a0a; border: 1px solid #ef4444; color: #fca5a5; }
  .status-message { background: #1e1b4b; border: 1px solid #4f46e5; color: #a5b4fc; }
  .connected-status { text-align: center; }
  .connection-info { font-size: 16px; color: #34d399; font-weight: 600; }
  .host-info, .players-info { font-size: 12px; color: #ccc; }
  .id-text { font-family: monospace; background: #333; padding: 2px 4px; border-radius: 4px; }
</style>