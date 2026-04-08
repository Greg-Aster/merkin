<!-- src/threlte/components/RemotePlayerAvatar.svelte -->
<script lang="ts">
  import { T } from '@threlte/core';
  import { AutoColliders } from '@threlte/rapier';
  import PlayerAvatar from './PlayerAvatar.svelte';

  export let position: [number, number, number] = [0, 0, 0];
</script>

<T.Group {position}>
  <AutoColliders shape={'capsule'}>
    <!-- Use the new PlayerAvatar for visuals -->
    <PlayerAvatar {position} />
  </AutoColliders>
</T.Group>