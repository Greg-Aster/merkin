<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { T } from '@threlte/core'
  import LevelManager from '../core/LevelManager.svelte'
  import { LightingComponent } from '../features/lighting'
  import { Ocean as OceanComponent, UnderwaterOverlay, underwaterStateStore } from '../features/ocean'
  import HybridFireflyComponent from '../components/HybridFireflyComponent.svelte'
  import NaturePackVegetation from '../components/NaturePackVegetation.svelte'
  import Skybox from '../systems/Skybox.svelte'
  import StarMap from '../systems/StarMap.svelte'
  import { qualitySettingsStore } from '../features/performance'
  import { OptimizationLevel, optimizationManager } from '../features/performance'
  import { Terrain, terrainStore, type TerrainConfig } from '../features/terrain'
  import { ConversationDialog, conversationUIState, isConversationActive, conversationActions } from '../features/conversation'
  import StarNavigationSystem from '../components/StarNavigationSystem.svelte'
  import { LODSystem } from '../features/performance'
  import GhibliStyleSystem from '../styles/GhibliStyleSystem.svelte'
  import StyleControls from '../ui/StyleControls.svelte'

  const dispatch = createEventDispatcher()

  // --- Props ---
  // The manifest URL is now the primary input for configuring the level
  export let manifestUrl: string = '/terrain/observatory-environment.manifest.json' // Generated manifest path
  export let timelineEvents: any[] = []
  export let timelineEventsJson: string = '[]'
  export let spawnSystem: any = null
  export let interactionSystem: any = null

  // --- State ---
  let manifest: any = null // Will hold the loaded level manifest data
  let terrainConfig: TerrainConfig | null = null
  let heightmapConfig: any = null // Loaded heightmap config for validation
  let playerSpawnPoint: [number, number, number] = [0, 50, 0] // Default spawn, will be overwritten by manifest

  // Component references
  let hybridFireflyComponent: HybridFireflyComponent
  let starMapComponent: StarMap
  let starNavigationSystem: StarNavigationSystem
  let naturePackVegetation: NaturePackVegetation
  let ghibliStyleSystem: GhibliStyleSystem
  let terrainReady = false
  let starMapRef: THREE.Group
  
  // Style configuration from manifest
  let stylePreset: 'ghibli' | 'alto' | 'monument' | 'retro' = 'ghibli'
  let enableToonShading = true
  
  // Timeline data state
  let realTimelineEvents: any[] = []
  let isLoadingTimeline = true
  let timelineLoadError: string | null = null

  // --- Lifecycle & Data Loading ---
  onMount(() => {
    loadLevelFromManifest();
    loadTimelineData();
  });

  async function loadLevelFromManifest() {
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch level manifest: ${response.statusText}`);
      }
      const data = await response.json();
      manifest = data;

      // Configure the level based on the loaded manifest
      playerSpawnPoint = manifest.spawn.position;

      // Configure style settings from manifest
      if (manifest.style) {
        stylePreset = manifest.style.preset || 'ghibli';
        enableToonShading = manifest.style.enabled !== false;
      }

      // Load bounds information from heightmap config if not in manifest
      let terrainBounds = null;
      if (manifest.physics?.bounds) {
        terrainBounds = manifest.physics.bounds;
      } else {
        // Try to load bounds and vertical parameters from the heightmap config file
        try {
          const heightmapConfigUrl = manifest.assets.heightmap.replace('_heightmap.png', '_config.json');
          const configResponse = await fetch(heightmapConfigUrl);
          if (configResponse.ok) {
            const configData = await configResponse.json();
            terrainBounds = configData.bounds;
            
            // Load vertical parameters from config to ensure exact match with generation  
            const worldSizeX = configData.bounds.max[0] - configData.bounds.min[0]
            const worldSizeZ = configData.bounds.max[2] - configData.bounds.min[2]
            
            heightmapConfig = {
              ...configData,
              minHeight: configData.heightOffset,
              maxHeight: configData.heightOffset + configData.heightScale,
              worldSizeX: worldSizeX,
              worldSizeZ: worldSizeZ
            };
            
            if (import.meta.env.DEV) console.log('✅ Loaded terrain config from heightmap:', {
              bounds: terrainBounds,
              worldSizeX: worldSizeX,
              worldSizeZ: worldSizeZ,
              aspectRatio: (worldSizeX / worldSizeZ).toFixed(3),
              heightOffset: configData.heightOffset,
              heightScale: configData.heightScale,
              computedMinHeight: heightmapConfig.minHeight,
              computedMaxHeight: heightmapConfig.maxHeight,
              manifestMinHeight: manifest.physics.minHeight,
              manifestMaxHeight: manifest.physics.maxHeight
            });
          }
        } catch (e) {
          if (import.meta.env.DEV) console.warn('⚠️ Could not load heightmap config for bounds:', e);
        }
      }

      // Build the terrain configuration object from the manifest
      terrainConfig = {
        heightmapUrl: manifest.assets.heightmap,
        worldSize: manifest.physics.worldSize,
        // Use heightmap config values for exact match with generation, fallback to manifest
        worldSizeX: heightmapConfig?.worldSizeX,
        worldSizeZ: heightmapConfig?.worldSizeZ,
        minHeight: heightmapConfig?.minHeight ?? manifest.physics.minHeight,
        maxHeight: heightmapConfig?.maxHeight ?? manifest.physics.maxHeight,
        bounds: terrainBounds,
        chunkPathTemplate: manifest.assets.chunksPath + 'chunk_{x}_{z}_LOD{lod}.glb',
        chunkSize: manifest.physics.chunkSize || (manifest.physics.worldSize / (manifest.physics.gridX || 4)),
        gridSize: [manifest.physics.gridX || 4, manifest.physics.gridY || 4],
        lods: [{ level: 0, distance: 1000 }]
      };

      // Validate height parameters match between manifest and config
      if (heightmapConfig && 
          (Math.abs(heightmapConfig.minHeight - manifest.physics.minHeight) > 0.01 ||
           Math.abs(heightmapConfig.maxHeight - manifest.physics.maxHeight) > 0.01)) {
        console.warn('⚠️ Height parameter mismatch detected:', {
          configMinHeight: heightmapConfig.minHeight,
          manifestMinHeight: manifest.physics.minHeight,
          configMaxHeight: heightmapConfig.maxHeight,
          manifestMaxHeight: manifest.physics.maxHeight,
          usingConfigValues: true
        });
      }

      // Register optimization settings from the manifest
      optimizationManager.registerComponent(manifest.id, {
        componentId: manifest.id,
        optimizationSettings: {
          [OptimizationLevel.ULTRA_LOW]: {
            oceanSegments: manifest.optimization.oceanSegments.ultra_low,
            terrainSegments: manifest.optimization.terrainSegments.ultra_low
          },
          [OptimizationLevel.LOW]: {
            oceanSegments: manifest.optimization.oceanSegments.low,
            terrainSegments: manifest.optimization.terrainSegments.low
          },
          [OptimizationLevel.MEDIUM]: {
            oceanSegments: manifest.optimization.oceanSegments.medium,
            terrainSegments: manifest.optimization.terrainSegments.medium
          },
          [OptimizationLevel.HIGH]: {
            oceanSegments: manifest.optimization.oceanSegments.high,
            terrainSegments: manifest.optimization.terrainSegments.high
          },
          [OptimizationLevel.ULTRA]: {
            oceanSegments: manifest.optimization.oceanSegments.ultra,
            terrainSegments: manifest.optimization.terrainSegments.ultra
          }
        }
      });

      console.log(`✅ Level "${manifest.name}" loaded successfully from manifest.`);

    } catch (error) {
      console.error(`❌ Failed to load level from ${manifestUrl}:`, error);
    }
  }

  // Fast height function for other components (uses unified terrain system)
  function getHeightAt(x: number, z: number): number {
    if ($terrainStore.manager) {
      return $terrainStore.manager.getHeightAt(x, z);
    }
    return -1000;
  }

  // --- Timeline Data Handling ---
  function loadTimelineData() {
    try {
      isLoadingTimeline = true
      timelineLoadError = null
      if (timelineEventsJson && timelineEventsJson !== '[]') {
        realTimelineEvents = JSON.parse(timelineEventsJson)
      } else if (timelineEvents.length > 0) {
        realTimelineEvents = timelineEvents
      } else {
        realTimelineEvents = []
      }
    } catch (error) {
      console.error('❌ Failed to process timeline data:', error)
      timelineLoadError = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      isLoadingTimeline = false
    }
  }

  // --- Event Handlers ---
  function handleStarSelected(event: CustomEvent) {
    dispatch('starSelected', event.detail)
  }
  function handleStarDeselected(event: CustomEvent) {
    dispatch('starDeselected', event.detail)
  }
  function handleLevelTransition(event: CustomEvent) {
    dispatch('levelTransition', event.detail)
  }
  function handleStyleSystemReady(event: CustomEvent) {
    console.log('🎨 Style system ready:', event.detail)
  }
  function handleStyleChanged(event: CustomEvent) {
    console.log('🎨 Style changed to:', event.detail.preset)
  }

  // Get current optimization settings reactively
  $: levelOptimizationSettings = manifest ? optimizationManager.getComponentSettings(manifest.id) : null;
</script>

{#if manifest}
  <LevelManager let:registry let:lighting let:ecsWorld>
    
    <!-- Ghibli Style System - enabled based on manifest -->
    {#if manifest.features.styles && $qualitySettingsStore.enableDynamicLighting}
      <GhibliStyleSystem 
        bind:this={ghibliStyleSystem}
        preset={stylePreset}
        enableToonShading={enableToonShading}
        enableOutlines={$qualitySettingsStore.enablePostProcessing}
        saturation={manifest.style.colorGrading?.saturation || 1.2}
        contrast={manifest.style.colorGrading?.contrast || 1.1}
        brightness={manifest.style.colorGrading?.brightness || 1.0}
        warmth={manifest.style.colorGrading?.warmth || 1.05}
        bloomIntensity={manifest.style.bloom?.intensity || 0.3}
        bloomThreshold={manifest.style.bloom?.threshold || 0.9}
        on:styleSystemReady={handleStyleSystemReady}
        on:styleChanged={handleStyleChanged}
      />
    {/if}
    
    <LODSystem enableLOD={true} maxDistance={200} updateFrequency={0.1} enableCulling={true} />
    
    <!-- Dynamic fog based on manifest style configuration -->
    <T.FogExp2 
      color={$underwaterStateStore.isUnderwater 
        ? (manifest.style?.fog?.color || '#006994')
        : (manifest.style?.fog?.color || '#6a7db3')} 
      density={$underwaterStateStore.isUnderwater 
        ? (manifest.style?.fog?.density * 50 || 0.1)
        : (manifest.style?.fog?.density || 0.002)} 
    />
    
    <T.Group name={manifest.id}>
      
      <Skybox 
        path="/assets/hdri/skywip4-cubemap/"
        files={['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp','nz.webp']}
      />
      
      {#if terrainConfig}
        <Terrain 
          config={terrainConfig}
          on:terrainReady={(e) => {
            terrainReady = true;
            setTimeout(() => {
              dispatch('terrainReady');
              if (spawnSystem && spawnSystem.requestSpawn) {
                const spawnHeight = getHeightAt(playerSpawnPoint[0], playerSpawnPoint[2]);
                spawnSystem.requestSpawn({
                  entityType: 'player',
                  position: [playerSpawnPoint[0], Math.max(playerSpawnPoint[1], spawnHeight + 2), playerSpawnPoint[2]],
                  priority: 10,
                  metadata: { levelName: manifest.name, spawnReason: 'level_load' }
                });
              }
            }, 10);
          }}
        />
      {/if}
      
      <!-- Ocean Component - configured from manifest -->
      {#if manifest.features.ocean}
        <OceanComponent 
          size={{ 
            width: manifest.ocean?.size?.width || 1000, 
            height: manifest.ocean?.size?.height || 1000 
          }}
          color={manifest.ocean?.underwaterFogColor || 0x006994}
          opacity={0.9}
          segments={levelOptimizationSettings?.oceanSegments || { width: 24, height: 24 }}
          enableAnimation={manifest.ocean?.enableAnimation !== false}
          animationSpeed={0.1}
          enableRising={manifest.ocean?.enableRising || false}
          initialLevel={manifest.ocean?.initialLevel || 0}
          targetLevel={manifest.ocean?.targetLevel || 0}
          riseRate={manifest.ocean?.riseRate || 0.01}
          enableUnderwaterEffects={true}
          waterCollisionSize={[
            800, 
            3.0, 
            800
          ]}
          underwaterFogDensity={manifest.ocean?.underwaterFogDensity || 0.1}
          underwaterFogColor={manifest.ocean?.underwaterFogColor || 0x006994}
          surfaceFogDensity={manifest.ocean?.surfaceFogDensity || 0.001}
          on:waterEnter={(e) => console.log('🌊 Player entered water at depth:', e.detail.depth)}
          on:waterExit={() => console.log('🏖️ Player exited water')}
          metalness={0.1}
          roughness={0.03}
          envMapIntensity={2.0}
        />
        <UnderwaterOverlay />
      {/if}

      <!-- Nature Pack Vegetation System - configured from manifest -->
      {#if manifest.features.vegetation && terrainReady}
        <NaturePackVegetation 
          bind:this={naturePackVegetation}
          {getHeightAt}
          count={$qualitySettingsStore.maxVegetationInstances * 10}
          radius={160}
          density={0.9}
          enableLOD={true}
          on:vegetationReady={(e) => console.log('🌱 Vegetation ready:', e.detail)}
        />
      {/if}

      <!-- Hybrid Firefly Component - configured from manifest -->
      {#if manifest.features.fireflies}
        <HybridFireflyComponent 
          bind:this={hybridFireflyComponent}
          {getHeightAt}
          {interactionSystem}
          count={100}
          lightIntensity={50.0}
          lightRange={500}
          cycleDuration={24.0}
          fadeSpeed={4.0}
          heightRange={{ min: 2.0, max: 5.0 }}
          radius={180}
          pointSize={25.0}
          movement={{
            speed: 0.01,
            wanderSpeed: 0.002,
            wanderRadius: 4,
            floatAmplitude: { x: .5, y: 0.5, z: 1.5 },
            lerpFactor: 1.0
          }}
          colors={[0x87ceeb, 0x98fb98, 0xffffe0, 0xdda0dd, 0xf0e68c, 0xffa07a, 0x20b2aa, 0x9370db]}
          enableAIConversations={manifest.features.conversations}
          conversationChance={.15}
        />
      {/if}
      
      <!-- Star Map and Navigation System - configured from manifest -->
      {#if manifest.features.starMap}
        {#if isLoadingTimeline}
          <T.Group position={[0, 5, 0]} name="loading-indicator">
            <T.Mesh>
              <T.SphereGeometry args={[2]} />
              <T.MeshBasicMaterial color="#00ff88" transparent opacity={0.6} />
            </T.Mesh>
          </T.Group>
        {:else if timelineLoadError}
          <T.Group position={[0, 5, 0]} name="error-indicator">
            <T.Mesh>
              <T.SphereGeometry args={[2]} />
              <T.MeshBasicMaterial color="#ff0044" transparent opacity={0.6} />
            </T.Mesh>
          </T.Group>
        {:else}
        <StarMap 
          bind:this={starMapComponent}
          bind:starMapRef={starMapRef}
          timelineEvents={realTimelineEvents}
          {interactionSystem}
          on:starSelected={handleStarSelected}
        />
          <StarNavigationSystem 
            bind:this={starNavigationSystem}
            timelineEvents={realTimelineEvents}
            starMapComponent={starMapComponent}
            on:starSelected={handleStarSelected}
            on:starDeselected={handleStarDeselected}
            on:levelTransition={handleLevelTransition}
            on:starInteraction={(e) => console.log('🎯 Star interaction:', e.detail)}
            on:transitionStarted={(e) => console.log('🎮 Transition started:', e.detail)}
            on:transitionCompleted={(e) => console.log('✅ Transition completed:', e.detail)}
            on:transitionFailed={(e) => console.log('❌ Transition failed:', e.detail)}
          />
        {/if}
      {/if}
      
    </T.Group>
  </LevelManager>

  <!-- AI Conversation Dialog - rendered outside of 3D scene, enabled by manifest -->
  {#if manifest.features.conversations && $isConversationActive}
    <ConversationDialog
      visible={$conversationUIState.isVisible}
      position={$conversationUIState.position}
      on:close={() => conversationActions.endConversation()}
    />
  {/if}

{:else}
  <!-- Loading state while manifest loads -->
  <T.Group position={[0, 10, 0]}>
    <T.Mesh>
      <T.SphereGeometry args={[1]} />
      <T.MeshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
    </T.Mesh>
  </T.Group>
{/if}
