<script lang="ts">
  import { T } from '@threlte/core'

  export let shape: 'cuboid' | 'cylinder' = 'cuboid'
  export let args: number[] = [1, 1, 1]
  export let position: [number, number, number] = [0, 0, 0]
  export let color = '#ff8c63'
</script>

<T.Group {position}>
  <T.Mesh>
    {#if shape === 'cuboid'}
      <T.BoxGeometry args={[args[0] * 2, args[1] * 2, args[2] * 2]} />
    {:else}
      <T.CylinderGeometry args={[args[1], args[1], args[0] * 2, 18]} />
    {/if}
    <T.MeshBasicMaterial {color} wireframe transparent opacity={0.48} depthWrite={false} />
  </T.Mesh>
</T.Group>
