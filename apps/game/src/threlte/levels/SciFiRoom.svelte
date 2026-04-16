<!-- sci-fi-room Level - Generated Interior Level -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { T } from '@threlte/core';
  import { GLTF } from '@threlte/extras';
  import LevelManager from '../core/LevelManager.svelte';
  import { LightingComponent } from '../features/lighting';
  import { gameActions } from '../stores/gameStateStore';
  
  const dispatch = createEventDispatcher();

  // Props from Game.svelte
  export let spawnSystem: any = null;
  export let interactionSystem: any = null;
  export let playerSpawnPoint: [number, number, number] = [0,1,0];

  // Load manifest
  let manifest: any = null;

  onMount(async () => {
    try {
      // Manifests for generated levels are in /public/terrain/
      const response = await fetch('/terrain/sci-fi-room.manifest.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }
      manifest = await response.json();
      console.log('📋 sci-fi-room: Manifest loaded:', manifest);
    } catch (error) {
      console.error('❌ sci-fi-room: Failed to load manifest:', error);
    }
  });

  function handleEnvironmentReady() {
    console.log('🏢 sci-fi-room: Environment loaded, requesting player spawn');

    // Request player spawn through ECS spawn system
    if (spawnSystem && spawnSystem.requestSpawn) {
      const spawnRequested = spawnSystem.requestSpawn({
        entityType: 'player',
        position: playerSpawnPoint,
        priority: 10,
        metadata: {
          levelName: 'sci-fi-room',
          spawnReason: 'level_load'
        }
      });

      if (!spawnRequested) {
        console.warn('🏢 sci-fi-room: Failed to request player spawn');
      }
    }

    dispatch('terrainReady');
  }

  function handleEnvironmentError(event: any) {
    console.error('❌ sci-fi-room: Failed to load GLB model — returning to observatory:', event);
    loadError = true;
    // Return to observatory so the player isn't stuck
    gameActions.transitionToLevel('observatory');
  }

  let loadError = false;
</script>

{#if manifest}
<LevelManager>
  <T.Group name="sci-fi-room-level">

    <!-- Environment: Load the GLB model using the modern GLTF component -->
    {#if !loadError}
      <GLTF
        url="/models/levels/sci-fi-room.glb"
        on:create={handleEnvironmentReady}
        on:error={handleEnvironmentError}
        castShadow
        receiveShadow
      />
    {/if}

    <!-- Lighting System -->
    <LightingComponent
      ambientIntensity={manifest.lighting.ambientIntensity}
      directionalLights={manifest.lighting.directionalLights}
    />

    <!-- Optional Feature Placeholders -->
    
    
    
    

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