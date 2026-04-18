<script lang="ts">
  import { T } from '@threlte/core';
  import HeroProp from '../../../components/HeroProp.svelte';
  import * as THREE from 'three';

  export let x: number;
  export let z: number;
  export let lod: number;
  export let position: THREE.Vector3;
  export let pathTemplate: string;

  $: url = pathTemplate
    .replace('{x}', x.toString())
    .replace('{z}', z.toString())
    .replace('{lod}', lod.toString());

  $: if (url && import.meta.env.DEV) {
    console.log('🏔️ TerrainChunk URL generated:', url);
  }

  function handleLoaded(event: CustomEvent<{ scene: THREE.Group }>) {
    if (import.meta.env.DEV) console.log('🏔️ TerrainChunk loaded (visual only, no collision):', url);
  }
</script>

<!-- Place the GLB at world origin; its internal geometry is already in world space -->
<T.Group position={[0, 0, 0]}>
  <!-- Visual only - no collision (terrain physics handled by TriMesh collider) -->
  <HeroProp {url} on:load={handleLoaded} />
</T.Group>
