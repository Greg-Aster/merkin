<!-- {levelName} Level - Generated Interior Level -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { T } from '@threlte/core';
  import { GLTF } from '@threlte/extras';
  import LevelManager from '../core/LevelManager.svelte';
  import { LightingComponent } from '../features/lighting';
  
  const dispatch = createEventDispatcher();

  // Props from Game.svelte
  export let spawnSystem: any = null;
  export let interactionSystem: any = null;
  export let playerSpawnPoint: [number, number, number] = {spawnPoint};

  // Load manifest
  let manifest: any = null;

  onMount(async () => {
    try {
      // Manifests for generated levels are in /public/terrain/
      const response = await fetch('/terrain/{levelId}.manifest.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }
      manifest = await response.json();
      console.log('📋 {levelName}: Manifest loaded:', manifest);
    } catch (error) {
      console.error('❌ {levelName}: Failed to load manifest:', error);
    }
  });

  function handleEnvironmentReady() {
    console.log('🏢 {levelName}: Environment loaded, requesting player spawn');
    
    // Request player spawn through ECS spawn system
    if (spawnSystem && spawnSystem.requestSpawn) {
      const spawnRequested = spawnSystem.requestSpawn({
        entityType: 'player',
        position: playerSpawnPoint,
        priority: 10,
        metadata: {
          levelName: '{levelName}',
          spawnReason: 'level_load'
        }
      });
      
      if (!spawnRequested) {
        console.warn('🏢 {levelName}: Failed to request player spawn');
      }
    }
    
    dispatch('terrainReady');
  }
</script>

{#if manifest}
<LevelManager>
  <T.Group name="{levelId}-level">

    <!-- Environment: Load the GLB model using the modern GLTF component -->
    <GLTF
      url="{glbPath}"
      on:create={handleEnvironmentReady}
      castShadow
      receiveShadow
    />

    <!-- Lighting System -->
    <LightingComponent
      ambientIntensity={manifest.lighting.ambientIntensity}
      directionalLights={manifest.lighting.directionalLights}
    />

    <!-- Optional Feature Placeholders -->
    {oceanComponent}
    {vegetationComponent}
    {fireflyComponent}
    {starMapComponent}

  </T.Group>
</LevelManager>
{:else}
  <!-- Loading state -->
  <T.Group position={[0, 1, 0]}>
    <T.Mesh>
      <T.BoxGeometry />
      <T.MeshBasicMaterial color="#ffaa00" wireframe={true} />
    </T.Mesh>
  </T.Group>
{/if}