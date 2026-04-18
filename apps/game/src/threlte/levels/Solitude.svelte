<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import AmbientParticleField from '../components/AmbientParticleField.svelte'
  import AmbientAudioRegions from '../components/AmbientAudioRegions.svelte'
  import LevelManager from '../core/LevelManager.svelte'
  import { Ocean as OceanComponent, UnderwaterOverlay } from '../features/ocean'
  import { underwaterStateStore } from '../features/ocean/stores/underwaterStore'
  import Skybox from '../systems/Skybox.svelte'
  import StarMap from '../systems/StarMap.svelte'
  import StarNavigationSystem from '../components/StarNavigationSystem.svelte'
  import { Terrain, terrainStore, type TerrainConfig } from '../features/terrain'
  import { playerStateStore } from '../stores/gameStateStore'
  import { editorSceneStore, editorStateStore, solitudeEditorSettingsStore } from '../editor/editorStore'
  import { createWorldMatrixResolver } from '../editor/editorHierarchyUtils'
  import { resolveSolitudePresetSettings } from '../editor/editorLevelPresets'

  const dispatch = createEventDispatcher()

  export let manifestUrl = '/terrain/solitude.manifest.json'
  export let timelineEvents: any[] = []
  export let timelineEventsJson = '[]'
  export let spawnSystem: any = null
  export let interactionSystem: any = null
  export let playerSpawnPoint: [number, number, number] = [0, 2.4, -24]

  let baseManifest: any = null
  let manifest: any = null
  let terrainConfig: TerrainConfig | null = null
  let realTimelineEvents: any[] = []
  let isLoadingTimeline = true
  let timelineLoadError: string | null = null
  let starMapRef: THREE.Group

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
      console.error('❌ Solitude: Failed to process timeline data:', error)
      timelineLoadError = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      isLoadingTimeline = false
    }
  }

  async function loadManifest() {
    const response = await fetch(manifestUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch solitude manifest: ${response.statusText}`)
    }

    baseManifest = await response.json()

    const bounds = baseManifest.physics?.bounds ?? null
    const heightmapConfigUrl = baseManifest.assets?.heightmap?.replace('_heightmap.png', '_config.json')
    let heightmapConfig: any = null

    if (heightmapConfigUrl) {
      try {
        const configResponse = await fetch(heightmapConfigUrl)
        if (configResponse.ok) {
          heightmapConfig = await configResponse.json()
        }
      } catch (error) {
        console.warn('Solitude heightmap config unavailable:', error)
      }
    }

    terrainConfig = {
      heightmapUrl: baseManifest.assets.heightmap,
      worldSize: baseManifest.physics.worldSize,
      worldSizeX: heightmapConfig?.bounds
        ? heightmapConfig.bounds.max[0] - heightmapConfig.bounds.min[0]
        : undefined,
      worldSizeZ: heightmapConfig?.bounds
        ? heightmapConfig.bounds.max[2] - heightmapConfig.bounds.min[2]
        : undefined,
      minHeight: heightmapConfig?.heightOffset ?? baseManifest.physics.minHeight,
      maxHeight: heightmapConfig
        ? heightmapConfig.heightOffset + heightmapConfig.heightScale
        : baseManifest.physics.maxHeight,
      bounds: heightmapConfig?.bounds ?? bounds,
      chunkSize: baseManifest.physics.chunkSize,
      gridSize: [baseManifest.physics.gridX || 1, baseManifest.physics.gridY || 1],
      lods: [{ level: 0, distance: baseManifest.physics.worldSize * 2 }],
    }
  }

  function applySolitudeEditorSettings(base: any, editorSettings: any) {
    if (!base) return null
    if (!editorSettings) return structuredClone(base)

    return {
      ...structuredClone(base),
      spawn: {
        ...base.spawn,
        ...(editorSettings.spawn ?? {}),
      },
      features: {
        ...base.features,
        starMap: editorSettings.features?.starMap ?? base.features?.starMap ?? true,
        conversations: editorSettings.features?.conversations ?? base.features?.conversations ?? true,
        water: editorSettings.features?.water ?? editorSettings.water?.enabled ?? false,
        styles: editorSettings.features?.styles ?? base.features?.styles ?? true,
        ambientParticles: editorSettings.features?.ambientParticles ?? true,
      },
      skyboxPreset: editorSettings.skyboxPreset ?? 'observatory',
      style: {
        ...base.style,
        preset: editorSettings.style?.preset ?? base.style?.preset,
        enabled: editorSettings.style?.enabled ?? base.style?.enabled,
        fog: {
          ...base.style?.fog,
          ...(editorSettings.style?.fog ?? {}),
        },
      },
      lighting: {
        ...base.lighting,
        ambientIntensity: editorSettings.lighting?.ambientIntensity ?? base.lighting?.ambientIntensity,
        directionalLights: [
          {
            ...(base.lighting?.directionalLights?.[0] ?? { position: [70, 110, 32], color: 13162239, intensity: 0.7 }),
            intensity: editorSettings.lighting?.keyLightIntensity ?? base.lighting?.directionalLights?.[0]?.intensity ?? 0.7,
          },
          {
            ...(base.lighting?.directionalLights?.[1] ?? { position: [-60, 36, -48], color: 4344686, intensity: 0.22 }),
            intensity: editorSettings.lighting?.fillLightIntensity ?? base.lighting?.directionalLights?.[1]?.intensity ?? 0.22,
          },
        ],
      },
      water: {
        enabled: editorSettings.water?.enabled ?? editorSettings.features?.water ?? false,
        level: editorSettings.water?.level ?? -0.16,
        size: {
          width: editorSettings.water?.size?.width ?? 800,
          height: editorSettings.water?.size?.height ?? 800,
        },
        color: editorSettings.water?.color ?? '#425d72',
        opacity: editorSettings.water?.opacity ?? 0.86,
        enableAnimation: editorSettings.water?.enableAnimation ?? true,
      },
      ambientParticles: {
        enabled: editorSettings.ambientParticles?.enabled ?? editorSettings.features?.ambientParticles ?? true,
        count: editorSettings.ambientParticles?.count ?? 180,
        radius: editorSettings.ambientParticles?.radius ?? 140,
        minHeight: editorSettings.ambientParticles?.minHeight ?? 0.8,
        maxHeight: editorSettings.ambientParticles?.maxHeight ?? 18,
        color: editorSettings.ambientParticles?.color ?? '#b8d9ff',
        secondaryColor: editorSettings.ambientParticles?.secondaryColor ?? '#f3e8b2',
        size: editorSettings.ambientParticles?.size ?? 1.15,
        opacity: editorSettings.ambientParticles?.opacity ?? 0.26,
        driftSpeed: editorSettings.ambientParticles?.driftSpeed ?? 0.22,
        sway: editorSettings.ambientParticles?.sway ?? 0.85,
      },
      ambientAudio: {
        enabled: editorSettings.ambientAudio?.enabled ?? false,
        track: editorSettings.ambientAudio?.track ?? '',
        volume: editorSettings.ambientAudio?.volume ?? 0.2,
        falloff: editorSettings.ambientAudio?.falloff ?? 36,
        position: editorSettings.ambientAudio?.position ?? [0, 8, 0],
        scale: editorSettings.ambientAudio?.scale ?? [1500, 120, 1500],
      },
    }
  }

  const SKYBOX_PRESETS = {
    observatory: {
      path: '/assets/hdri/skywip4-cubemap/',
      files: ['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp', 'nz.webp'] as [string, string, string, string, string, string],
    },
    classic: {
      path: '/assets/skyboxes/',
      files: ['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp', 'nz.webp'] as [string, string, string, string, string, string],
    },
  } as const

  function handleStarSelected(event: CustomEvent) {
    dispatch('starSelected', event.detail)
  }

  function handleStarDeselected(event: CustomEvent) {
    dispatch('starDeselected', event.detail)
  }

  function handleLevelTransition(event: CustomEvent) {
    dispatch('levelTransition', event.detail)
  }

  function getSpawnHeight() {
    if (!$terrainStore.manager) return playerSpawnPoint[1]
    return $terrainStore.manager.getHeightAt(playerSpawnPoint[0], playerSpawnPoint[2])
  }

  $: resolvedSolitudeSettings = resolveSolitudePresetSettings($solitudeEditorSettingsStore)
  $: manifest = baseManifest ? applySolitudeEditorSettings(baseManifest, resolvedSolitudeSettings) : null
  $: playerSpawnPoint = manifest?.spawn?.position ?? [0, 2.4, -24]
  $: waterEnabled = manifest?.features?.water ?? manifest?.water?.enabled ?? false
  $: activeSkyboxPreset = SKYBOX_PRESETS[manifest?.skyboxPreset as keyof typeof SKYBOX_PRESETS] ?? SKYBOX_PRESETS.observatory
  $: ambientParticlesEnabled = manifest?.features?.ambientParticles ?? manifest?.ambientParticles?.enabled ?? true
  $: presetAmbientAudioRegions = manifest?.ambientAudio?.enabled && manifest?.ambientAudio?.track
    ? [{
        id: 'solitude-preset-ambient-audio',
        position: manifest.ambientAudio.position ?? [0, 8, 0],
        scale: manifest.ambientAudio.scale ?? [1500, 120, 1500],
        track: manifest.ambientAudio.track,
        volume: manifest.ambientAudio.volume ?? 0.2,
        falloff: manifest.ambientAudio.falloff ?? 36,
      }]
    : []
  $: authoredGameplayNodes = (() => {
    const scene = $editorSceneStore
    if (!scene) return []
    const getWorldMatrix = createWorldMatrixResolver(scene.nodes)

    return scene.nodes
      .filter((node) => node.gameplay?.type === 'audio-region' || node.gameplay?.type === 'fog-volume')
      .map((node) => {
        const worldMatrix = getWorldMatrix(node.id)
        const position = new THREE.Vector3()
        const quaternion = new THREE.Quaternion()
        const scale = new THREE.Vector3()
        worldMatrix.decompose(position, quaternion, scale)
        return {
          node,
          position: [position.x, position.y, position.z] as [number, number, number],
          scale: [Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z)] as [number, number, number],
        }
      })
  })()
  $: authoredAudioRegions = authoredGameplayNodes
    .filter((entry) => entry.node.gameplay?.type === 'audio-region' && entry.node.gameplay?.audioTrack)
    .map((entry) => ({
      id: entry.node.id,
      position: entry.position,
      scale: entry.scale,
      track: entry.node.gameplay?.audioTrack ?? '',
      volume: entry.node.gameplay?.audioVolume ?? 0.24,
      falloff: entry.node.gameplay?.regionFalloff ?? 12,
    }))
  $: effectiveAudioRegions = [...presetAmbientAudioRegions, ...authoredAudioRegions]
  $: effectiveFog = (() => {
    const playerPosition = $playerStateStore.position
    const fogVolumes = authoredGameplayNodes.filter((entry) => entry.node.gameplay?.type === 'fog-volume')
    const baseColor = new THREE.Color(manifest?.style?.fog?.color ?? '#7b8797')
    const baseDensity = manifest?.style?.fog?.density ?? 0.00045

    let strongestInfluence = 0
    let targetColor = baseColor.clone()
    let targetDensity = baseDensity

    for (const entry of fogVolumes) {
      const [px, py, pz] = playerPosition
      const [cx, cy, cz] = entry.position
      const [sx, sy, sz] = entry.scale.map((value) => Math.abs(value) / 2) as [number, number, number]
      const dx = Math.max(Math.abs(px - cx) - sx, 0)
      const dy = Math.max(Math.abs(py - cy) - sy, 0)
      const dz = Math.max(Math.abs(pz - cz) - sz, 0)
      const outsideDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const falloff = entry.node.gameplay?.regionFalloff ?? 8
      const influence = outsideDistance <= 0.0001
        ? 1
        : outsideDistance >= falloff
          ? 0
          : 1 - outsideDistance / Math.max(0.001, falloff)

      if (influence > strongestInfluence) {
        strongestInfluence = influence
        targetColor = new THREE.Color(entry.node.gameplay?.fogColor ?? '#9ba9bb')
        targetDensity = entry.node.gameplay?.fogDensity ?? 0.0025
      }
    }

    const blendedColor = baseColor.clone().lerp(targetColor, strongestInfluence)
    const blendedDensity = baseDensity + (targetDensity - baseDensity) * strongestInfluence
    return {
      color: `#${blendedColor.getHexString()}`,
      density: blendedDensity,
    }
  })()

  onMount(() => {
    void loadManifest().catch((error) => {
      console.error('❌ Solitude: Failed to load manifest:', error)
    })
    loadTimelineData()
  })
</script>

{#if manifest && terrainConfig}
  <LevelManager>
    <T.Group name={manifest.id ?? 'solitude-level'}>
      <Skybox
        path={activeSkyboxPreset.path}
        files={activeSkyboxPreset.files}
      />

      <T.AmbientLight color="#d5dff0" intensity={manifest.lighting?.ambientIntensity ?? 0.75} />
      <T.HemisphereLight skyColor="#d9ebff" groundColor="#2a3340" intensity={0.58} />
      <T.DirectionalLight position={[70, 110, 32]} color="#c7d6ff" intensity={manifest.lighting?.directionalLights?.[0]?.intensity ?? 0.7} castShadow={false} />
      <T.DirectionalLight position={[-60, 36, -48]} color="#42536e" intensity={manifest.lighting?.directionalLights?.[1]?.intensity ?? 0.22} castShadow={false} />

      <T.FogExp2
        color={$editorStateStore.enabled && $editorStateStore.viewportLightingMode === 'workbench'
          ? '#dde8f4'
          : effectiveFog.color}
        density={$editorStateStore.enabled && $editorStateStore.viewportLightingMode === 'workbench'
          ? 0.00014
          : effectiveFog.density}
      />

      <Terrain
        config={terrainConfig}
        on:terrainReady={() => {
          dispatch('terrainReady')
          if (spawnSystem?.requestSpawn) {
            const spawnHeight = getSpawnHeight()
            spawnSystem.requestSpawn({
              entityType: 'player',
              position: [playerSpawnPoint[0], Math.max(playerSpawnPoint[1], spawnHeight + 1.5), playerSpawnPoint[2]],
              priority: 10,
              metadata: { levelName: manifest.id ?? 'solitude', spawnReason: 'level_load' },
            })
          }
        }}
      />

      {#if waterEnabled}
        <OceanComponent
          size={{
            width: manifest.water?.size?.width ?? 800,
            height: manifest.water?.size?.height ?? 800,
          }}
          position={[0, manifest.water?.level ?? -0.16, 0]}
          color={Number.parseInt((manifest.water?.color ?? '#425d72').replace('#', ''), 16)}
          opacity={manifest.water?.opacity ?? 0.86}
          enableAnimation={manifest.water?.enableAnimation ?? true}
          enableUnderwaterEffects={true}
          waterCollisionSize={[
            (manifest.water?.size?.width ?? 800) * 0.9,
            2,
            (manifest.water?.size?.height ?? 800) * 0.9,
          ]}
          underwaterFogDensity={0.08}
          underwaterFogColor={0x0a1922}
          surfaceFogDensity={0.001}
          metalness={0.08}
          roughness={0.04}
          envMapIntensity={1.8}
        />
        {#if $underwaterStateStore.isUnderwater || $underwaterStateStore.transitionProgress > 0}
          <UnderwaterOverlay />
        {/if}
      {/if}

      {#if ambientParticlesEnabled}
        <AmbientParticleField
          enabled={true}
          count={manifest.ambientParticles?.count ?? 180}
          radius={manifest.ambientParticles?.radius ?? 140}
          minHeight={manifest.ambientParticles?.minHeight ?? 0.8}
          maxHeight={manifest.ambientParticles?.maxHeight ?? 18}
          color={manifest.ambientParticles?.color ?? '#b8d9ff'}
          secondaryColor={manifest.ambientParticles?.secondaryColor ?? '#f3e8b2'}
          size={manifest.ambientParticles?.size ?? 1.15}
          opacity={manifest.ambientParticles?.opacity ?? 0.26}
          driftSpeed={manifest.ambientParticles?.driftSpeed ?? 0.22}
          sway={manifest.ambientParticles?.sway ?? 0.85}
          center={[0, 0, 0]}
        />
      {/if}

      {#if effectiveAudioRegions.length > 0}
        <AmbientAudioRegions regions={effectiveAudioRegions} enabled={true} />
      {/if}

      {#if manifest.features?.starMap && isLoadingTimeline}
        <T.Group position={[0, 8, 0]} name="solitude-starmap-loading">
          <T.Mesh>
            <T.SphereGeometry args={[0.7]} />
            <T.MeshBasicMaterial color="#d8eaff" transparent opacity={0.72} />
          </T.Mesh>
        </T.Group>
      {:else if manifest.features?.starMap && timelineLoadError}
        <T.Group position={[0, 8, 0]} name="solitude-starmap-error">
          <T.Mesh>
            <T.SphereGeometry args={[0.7]} />
            <T.MeshBasicMaterial color="#ff5b7a" transparent opacity={0.72} />
          </T.Mesh>
        </T.Group>
      {:else if manifest.features?.starMap}
        <T.Group position={[0, 1.5, 0]} rotation={[-0.08, -0.52, 0.02]}>
          <StarMap
            bind:starMapRef={starMapRef}
            timelineEvents={realTimelineEvents}
            {interactionSystem}
            on:starSelected={handleStarSelected}
          />
        </T.Group>

        <StarNavigationSystem
          timelineEvents={realTimelineEvents}
          starMapComponent={starMapRef}
          on:starSelected={handleStarSelected}
          on:starDeselected={handleStarDeselected}
          on:levelTransition={handleLevelTransition}
        />
      {/if}
    </T.Group>
  </LevelManager>
{/if}
