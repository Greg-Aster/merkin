<script lang="ts">
  import { onMount } from 'svelte';
  import { hostStore, initializeHost, registerRoom } from '../index';
  import LogTerminal from './LogTerminal.svelte';
  import { setInputFocus } from '../../../stores/uiStore';
  import { playerNameStore } from '../index';

  // Add this line to define isRegistered
  $: isRegistered = $hostStore.isRoomRegistered;

  let roomNameInput = '';
  let copyButtonText = '📋 Copy Join Link';

  // When the component loads, start the host service
  onMount(() => {
    initializeHost();
  });

  // Sanitization function to ensure room names are clean
  function sanitizeRoomName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  // Called when the user clicks the "Register Room" button
  async function handleRegisterRoom() {
    const saneName = sanitizeRoomName(roomNameInput);
    if (saneName.length < 3 || !$hostStore.hostId) return;

    const success = await registerRoom(saneName, $hostStore.hostId);
    if (success) {
      hostStore.setRoomName(saneName);
      hostStore.setRoomRegistered(true);
    }
  }

  // Generates the shareable URL
  function getJoinUrl(): string {
    if (!$hostStore.isRoomRegistered || !$hostStore.roomName) return '';
    return `${window.location.origin}/game/?room=${$hostStore.roomName}`;
  }

  // Copies the URL to the clipboard
  async function copyJoinLink() {
    const url = getJoinUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      copyButtonText = '✓ Copied!';
      setTimeout(() => copyButtonText = '📋 Copy Join Link', 2000);
    } catch (err) {
      copyButtonText = '❌ Copy Failed' ;
      setTimeout(() => copyButtonText = '📋 Copy Join Link', 2000);
    }
  }
</script>

<div class="host-panel">
  <h1>🎮 MEGAMEAL Host Panel</h1>

  <!-- This section will only show AFTER the host service is ready -->
  {#if $hostStore.hostId}
    <!-- If the room is NOT yet registered, show the registration form -->
    {#if !$hostStore.isRoomRegistered}
      <div class="room-registration-section">
        <h2>🏠 Create Your Room</h2>
        <p>Choose a memorable name. Players will use this to join.</p>
        <div class="input-group">
          <input
            type="text"
            bind:value={roomNameInput}
            placeholder="my-epic-game-room"
            disabled={isRegistered}
            on:focus={() => setInputFocus(true)}
            on:blur={() => setInputFocus(false)}
          />
          <button on:click={handleRegisterRoom} disabled={roomNameInput.length < 3}>
            🚀 Register Room
          </button>
        </div>
      </div>
    {/if}

    <!-- If the room IS registered, show the "Room is Live" panel -->
    {#if $hostStore.isRoomRegistered}
      <div class="room-active-section">
        <h2>🎉 Room is Live!</h2>
        <div class="join-section">
          <label>Share this link with players:</label>
          <div class="join-url">{getJoinUrl()}</div>
          <button on:click={copyJoinLink}>{copyButtonText}</button>
        </div>
      </div>
    {/if}

    <!-- Player list and other features will go here -->
    <section class="card">
        <h2>Connected Players ({$hostStore.players.length})</h2>
        {#if $hostStore.players.length > 0}
          <ul class="player-list">
            {#each $hostStore.players as player (player.peerId)}
              <li class="player-item">
                <span class="player-name">{playerNameStore.getName(player.peerId)}</span>
                <div class="player-controls">
                  <button class="btn-small btn-warning">🔇 Mute</button>
                  <button class="btn-small btn-danger">👋 Kick</button>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty-state">Waiting for players to join...</p>
        {/if}
    </section>

    <!-- Server Information Section -->
    <section class="card">
      <h2>Server Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <label>Server Name:</label>
          <span>{$hostStore.serverName}</span>
        </div>
        <div class="info-item">
          <label>Technical Host ID:</label>
          <span class="host-id">{$hostStore.hostId}</span>
        </div>
        <div class="info-item">
          <label>Room Name:</label>
          <span>{$hostStore.roomName || 'Not registered'}</span>
        </div>
        <div class="info-item">
          <label>Status:</label>
          <span class="status-live">🟢 Live & Accepting Connections</span>
        </div>
      </div>
    </section>
  {:else if $hostStore.error}
    <div class="error-section">
      <h2>❌ Host Service Error</h2>
      <p>{$hostStore.error}</p>
      <button on:click={() => window.location.reload()}>🔄 Retry</button>
    </div>
  {:else}
    <div class="loading-section">
      <h2>⏳ Initializing Host Service</h2>
      <p>Please wait while we set up your multiplayer session...</p>
    </div>
  {/if}
  
  <!-- The log terminal is always visible at the bottom -->
  <LogTerminal />
</div>

<!-- Use the superior styles from your legacy file -->
<style>
  :global(body) {
    --bg-primary: #1a1a1a; --bg-secondary: #282828; --text-primary: #f0f0f0;
    --accent-primary: #4f46e5; --border-color: #444;
    background-color: var(--bg-primary); color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .host-panel { 
    max-width: 800px; margin: 2em auto; padding: 2em; 
    background-color: var(--bg-secondary); border: 1px solid var(--border-color); 
    border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  h1 { 
    text-align: center; border-bottom: 2px solid var(--accent-primary); 
    padding-bottom: 0.5rem; margin-bottom: 1.5rem; font-size: 2rem; font-weight: 600;
  }
  h2 { margin: 1.5rem 0 1rem; font-size: 1.3rem; font-weight: 500; }
  .room-registration-section, .room-active-section, .card { 
    background-color: #3a3a3a; padding: 1.5rem; border-radius: 8px; 
    margin-bottom: 1.5rem; border: 1px solid var(--border-color);
  }
  .input-group, .join-section { display: flex; flex-direction: column; gap: 1rem; }
  label { font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary); }
  input { 
    width: 100%; box-sizing: border-box; padding: 0.75rem; 
    background-color: var(--bg-primary); border: 1px solid var(--border-color); 
    border-radius: 6px; color: var(--text-primary); font-size: 1rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  input:focus {
    outline: none; border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  }
  input::placeholder { color: #b0b0b0; }
  button { 
    padding: 0.75rem 1.25rem; border: none; border-radius: 6px; 
    font-size: 1rem; font-weight: 500; cursor: pointer; 
    background-color: var(--accent-primary); color: white;
    transition: all 0.2s ease;
  }
  button:hover:not(:disabled) {
    background-color: #4338ca; transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .join-url { 
    font-family: monospace; background: var(--bg-primary); 
    padding: 0.75rem; border-radius: 6px; word-wrap: break-word; 
    color: var(--accent-primary); border: 1px solid var(--border-color);
  }

  /* Player List Styles */
  .player-list { list-style: none; padding: 0; margin: 0; }
  .player-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.75rem; background-color: var(--bg-primary);
    border: 1px solid var(--border-color); border-radius: 6px;
    margin-bottom: 0.5rem; font-family: monospace;
  }
  .player-name { font-weight: 600; color: var(--text-primary); }
  .player-controls { display: flex; gap: 0.5rem; }
  .btn-small { 
    padding: 0.5rem 0.75rem; font-size: 0.8rem; border-radius: 4px;
  }
  .btn-warning { background-color: #f59e0b; color: #1a1a1a; }
  .btn-warning:hover { background-color: #d97706; }
  .btn-danger { background-color: #ef4444; color: white; }
  .btn-danger:hover { background-color: #dc2626; }
  .empty-state { 
    text-align: center; color: #b0b0b0; font-style: italic; 
    padding: 2rem; 
  }

  /* Server Information */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .info-item { display: flex; flex-direction: column; gap: 0.25rem; }
  .info-item label { font-size: 0.9rem; color: #b0b0b0; font-weight: 500; }
  .info-item span { font-weight: 600; }
  .host-id { 
    font-family: monospace; background: var(--bg-primary); 
    padding: 0.5rem; border-radius: 4px; font-size: 0.9rem;
    color: var(--accent-primary); border: 1px solid var(--border-color);
  }
  .status-live { color: #10b981; font-weight: 600; }

  /* Error and Loading States */
  .error-section, .loading-section {
    text-align: center; padding: 2rem; 
    background-color: #3a3a3a; border-radius: 8px; 
    margin-bottom: 1.5rem;
  }
  .error-section { border: 1px solid #ef4444; }
  .loading-section { border: 1px solid #f59e0b; }

  /* Responsive Design */
  @media (max-width: 768px) {
    .host-panel { margin: 1em; padding: 1.5em; }
    h1 { font-size: 1.5rem; }
    .input-group { gap: 1.5rem; }
    .info-grid { grid-template-columns: 1fr; }
    .player-controls { flex-direction: column; gap: 0.25rem; }
  }
</style>