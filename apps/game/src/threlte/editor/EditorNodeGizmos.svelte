<script lang="ts">
import ProceduralMesh from '../components/ProceduralMesh.svelte'

export let selected = false
</script>

{#if selected}
  <ProceduralMesh
    geometry="torus"
    args={[0.9, 0.03, 12, 28]}
    position={[0, 0.05, 0]}
    rotation={[Math.PI / 2, 0, 0]}
    scale={[1, 1, 1]}
    color="#7ecbff"
    emissive="#7ecbff"
    emissiveIntensity={0.5}
    metalness={1}
    roughness={0.04}
    transparent={true}
    opacity={0.5}
  />
{/if}
