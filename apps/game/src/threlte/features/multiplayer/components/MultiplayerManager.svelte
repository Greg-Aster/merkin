<script lang="ts">
  import { multiplayerStore } from '../stores/multiplayerStore';
  import RemotePlayerAvatar from './RemotePlayerAvatar.svelte';
</script>

{#each Object.entries($multiplayerStore.players) as [id, player] (id)}
  <!-- Only render avatars for OTHER players -->
  {#if id !== $multiplayerStore.peerId}
    <RemotePlayerAvatar position={player.position} />
  {/if}
{/each}