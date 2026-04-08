<script lang="ts">
  import { logStore, type LogEntry } from '../index';
  import { onMount } from 'svelte';

  let terminalElement: HTMLDivElement;

  // Reactive statement to scroll to bottom when logs change
  $: if (terminalElement && $logStore.length) {
    terminalElement.scrollTop = terminalElement.scrollHeight;
  }
</script>

<div class="terminal-container">
  <div class="terminal-header">
    <span>Live Log</span>
    <button on:click={logStore.clearLogs}>Clear</button>
  </div>
  <div class="terminal" bind:this={terminalElement}>
    {#each $logStore as log (log.timestamp + log.message)}
      <div class="log-entry {log.type}">
        <span class="timestamp">{log.timestamp}</span>
        <span class="message">{log.message}</span>
      </div>
    {:else}
      <div class="log-entry info">
        <span class="timestamp">{new Date().toLocaleTimeString()}</span>
        <span class="message">Log terminal initialized. Waiting for events...</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .terminal-container { background: #1a1a1a; border: 1px solid #444; border-radius: 8px; margin-top: 2em; }
  .terminal-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #333; border-bottom: 1px solid #444; font-weight: bold; font-size: 14px; }
  .terminal-header button { background: #555; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .terminal { height: 200px; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 13px; }
  .log-entry { display: flex; gap: 15px; margin-bottom: 4px; }
  .timestamp { color: #888; }
  .message { white-space: pre-wrap; word-break: break-all; }
  .log-entry.info .message { color: #a5b4fc; }
  .log-entry.success .message { color: #34d399; }
  .log-entry.error .message { color: #f87171; }
  .log-entry.warn .message { color: #facc15; }
</style>
