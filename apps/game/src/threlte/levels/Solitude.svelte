<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import AmbientParticleField from '../components/AmbientParticleField.svelte'
  import AmbientAudioRegions from '../components/AmbientAudioRegions.svelte'
  import SceneFogExp2 from '../components/SceneFogExp2.svelte'
  import LevelManager from '../core/LevelManager.svelte'
  import { Ocean as OceanComponent, UnderwaterOverlay } from '../features/ocean'
  import { underwaterStateStore } from '../features/ocean/stores/underwaterStore'
  import Skybox from '../systems/Skybox.svelte'
  import StarMap from '../systems/StarMap.svelte'
  import StarNavigationSystem from '../components/StarNavigationSystem.svelte'
  import { Terrain, terrainStore, type TerrainConfig } from '../features/terrain'
  import { qualityLevelStore, qualitySettingsStore } from '../features/performance/stores/performanceStore'
  import { shouldEnableSceneShadows } from '../features/performance/utils/runtimeSceneBudget'
  import { playerStateStore } from '../stores/gameStateStore'
  import { editorSceneStore, editorStateStore, solitudeEditorSettingsStore } from '../editor/editorStore'
  import { createWorldMatrixResolver } from '../editor/editorHierarchyUtils'
  import { resolveSolitudePresetSettings } from '../editor/editorLevelPresets'
  import {
    buildSolitudeRuntimeVisualStyle,
    DEFAULT_SOLITUDE_ATMOSPHERE_PRESET,
    getSolitudeAtmosphereProfile,
  } from '../styles/GameplayStyleProfiles'
  import { replaceRuntimeVisualStyle, resetRuntimeVisualStyle } from '../styles/runtimeVisualStyleStore'

  const dispatch = createEventDispatcher()
  const isDev = import.meta.env.DEV

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
        if (isDev) {
          console.warn('Solitude heightmap config unavailable:', error)
        }
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
    const resolvedEditorSettings = editorSettings ?? {}
    const profileDefaults = getSolitudeAtmosphereProfile(
      resolvedEditorSettings.presets?.atmosphere ?? DEFAULT_SOLITUDE_ATMOSPHERE_PRESET,
    )
    const defaultSettings = profileDefaults.settings

    return {
      ...structuredClone(base),
      spawn: {
        ...base.spawn,
        ...(resolvedEditorSettings.spawn ?? {}),
      },
      features: {
        ...base.features,
        starMap: resolvedEditorSettings.features?.starMap ?? base.features?.starMap ?? true,
        conversations: resolvedEditorSettings.features?.conversations ?? base.features?.conversations ?? true,
        water: resolvedEditorSettings.features?.water ?? resolvedEditorSettings.water?.enabled ?? false,
        styles: resolvedEditorSettings.features?.styles ?? base.features?.styles ?? true,
        ambientParticles: resolvedEditorSettings.features?.ambientParticles ?? defaultSettings.features?.ambientParticles ?? true,
      },
      skyboxPreset: resolvedEditorSettings.skyboxPreset ?? base.skyboxPreset ?? defaultSettings.skyboxPreset ?? 'observatory',
      style: {
        ...base.style,
        preset: resolvedEditorSettings.style?.preset ?? base.style?.preset ?? defaultSettings.style?.preset ?? 'surreal-site',
        enabled: resolvedEditorSettings.style?.enabled ?? base.style?.enabled ?? defaultSettings.style?.enabled ?? true,
        fog: {
          ...base.style?.fog,
          color: resolvedEditorSettings.style?.fog?.color ?? base.style?.fog?.color ?? defaultSettings.style?.fog?.color ?? '#43206c',
          density: resolvedEditorSettings.style?.fog?.density ?? base.style?.fog?.density ?? defaultSettings.style?.fog?.density ?? 0.00092,
        },
        haze: {
          ...base.style?.haze,
          ...(resolvedEditorSettings.style?.haze ?? {}),
        },
        colorGrading: {
          ...base.style?.colorGrading,
          ...defaultSettings.style?.colorGrading,
          ...(resolvedEditorSettings.style?.colorGrading ?? {}),
        },
        bloom: {
          ...base.style?.bloom,
          ...defaultSettings.style?.bloom,
          ...(resolvedEditorSettings.style?.bloom ?? {}),
        },
      },
      lighting: {
        ...base.lighting,
        ambientIntensity: resolvedEditorSettings.lighting?.ambientIntensity ?? base.lighting?.ambientIntensity ?? defaultSettings.lighting?.ambientIntensity ?? 0.46,
        directionalLights: [
          {
            ...(base.lighting?.directionalLights?.[0] ?? { position: [70, 110, 32], color: 13162239, intensity: 0.7 }),
            intensity: resolvedEditorSettings.lighting?.keyLightIntensity ?? base.lighting?.directionalLights?.[0]?.intensity ?? defaultSettings.lighting?.keyLightIntensity ?? 0.96,
          },
          {
            ...(base.lighting?.directionalLights?.[1] ?? { position: [-60, 36, -48], color: 4344686, intensity: 0.22 }),
            intensity: resolvedEditorSettings.lighting?.fillLightIntensity ?? base.lighting?.directionalLights?.[1]?.intensity ?? defaultSettings.lighting?.fillLightIntensity ?? 0.34,
          },
        ],
      },
      water: {
        enabled: resolvedEditorSettings.water?.enabled ?? resolvedEditorSettings.features?.water ?? base.water?.enabled ?? defaultSettings.water?.enabled ?? false,
        level: resolvedEditorSettings.water?.level ?? base.water?.level ?? defaultSettings.water?.level ?? -0.16,
        size: {
          width: resolvedEditorSettings.water?.size?.width ?? base.water?.size?.width ?? defaultSettings.water?.size?.width ?? 800,
          height: resolvedEditorSettings.water?.size?.height ?? base.water?.size?.height ?? defaultSettings.water?.size?.height ?? 800,
        },
        color: resolvedEditorSettings.water?.color ?? base.water?.color ?? defaultSettings.water?.color ?? '#182f63',
        opacity: resolvedEditorSettings.water?.opacity ?? base.water?.opacity ?? defaultSettings.water?.opacity ?? 0.9,
        enableAnimation: resolvedEditorSettings.water?.enableAnimation ?? base.water?.enableAnimation ?? defaultSettings.water?.enableAnimation ?? true,
        underwaterFogDensity: resolvedEditorSettings.water?.underwaterFogDensity ?? base.water?.underwaterFogDensity ?? 0.1,
        underwaterFogColor: resolvedEditorSettings.water?.underwaterFogColor ?? base.water?.underwaterFogColor ?? 0x081121,
        surfaceFogDensity: resolvedEditorSettings.water?.surfaceFogDensity ?? base.water?.surfaceFogDensity ?? 0.0012,
      },
      ambientParticles: {
        enabled: resolvedEditorSettings.ambientParticles?.enabled ?? resolvedEditorSettings.features?.ambientParticles ?? defaultSettings.ambientParticles?.enabled ?? true,
        count: resolvedEditorSettings.ambientParticles?.count ?? defaultSettings.ambientParticles?.count ?? 220,
        radius: resolvedEditorSettings.ambientParticles?.radius ?? defaultSettings.ambientParticles?.radius ?? 132,
        minHeight: resolvedEditorSettings.ambientParticles?.minHeight ?? defaultSettings.ambientParticles?.minHeight ?? 0.35,
        maxHeight: resolvedEditorSettings.ambientParticles?.maxHeight ?? defaultSettings.ambientParticles?.maxHeight ?? 9.5,
        color: resolvedEditorSettings.ambientParticles?.color ?? defaultSettings.ambientParticles?.color ?? '#58e6ff',
        secondaryColor: resolvedEditorSettings.ambientParticles?.secondaryColor ?? defaultSettings.ambientParticles?.secondaryColor ?? '#ff4cd0',
        size: resolvedEditorSettings.ambientParticles?.size ?? defaultSettings.ambientParticles?.size ?? 1.22,
        opacity: resolvedEditorSettings.ambientParticles?.opacity ?? defaultSettings.ambientParticles?.opacity ?? 0.22,
        driftSpeed: resolvedEditorSettings.ambientParticles?.driftSpeed ?? defaultSettings.ambientParticles?.driftSpeed ?? 0.14,
        sway: resolvedEditorSettings.ambientParticles?.sway ?? defaultSettings.ambientParticles?.sway ?? 0.62,
      },
      ambientAudio: {
        enabled: resolvedEditorSettings.ambientAudio?.enabled ?? false,
        track: resolvedEditorSettings.ambientAudio?.track ?? '',
        volume: resolvedEditorSettings.ambientAudio?.volume ?? 0.2,
        falloff: resolvedEditorSettings.ambientAudio?.falloff ?? 36,
        position: resolvedEditorSettings.ambientAudio?.position ?? [0, 8, 0],
        scale: resolvedEditorSettings.ambientAudio?.scale ?? [1500, 120, 1500],
      },
      presets: {
        ...(resolvedEditorSettings.presets ?? {}),
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

  function clampNumber(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
  }

  function gradeSceneColor(
    colorValue: string,
    colorGrading: { saturation?: number, brightness?: number, warmth?: number } | undefined,
  ) {
    const nextColor = new THREE.Color(colorValue)
    const hsl = { h: 0, s: 0, l: 0 }
    nextColor.getHSL(hsl)

    const saturation = colorGrading?.saturation ?? 1
    const brightness = colorGrading?.brightness ?? 1
    const warmth = colorGrading?.warmth ?? 1

    const warmedHue = (hsl.h + ((warmth - 1) * 0.03) + 1) % 1
    const gradedSaturation = clampNumber(hsl.s * (0.92 + ((saturation - 1) * 0.75)), 0, 1)
    const gradedLightness = clampNumber(hsl.l + ((brightness - 1) * 0.08), 0, 1)

    nextColor.setHSL(warmedHue, gradedSaturation, gradedLightness)
    return `#${nextColor.getHexString()}`
  }

  function gradeLightIntensity(
    baseIntensity: number,
    role: 'ambient' | 'hemi' | 'key' | 'fill',
    colorGrading: { contrast?: number, brightness?: number } | undefined,
  ) {
    const contrast = colorGrading?.contrast ?? 1
    const brightness = colorGrading?.brightness ?? 1

    const brightnessScale = 0.92 + ((brightness - 1) * 0.7)
    const contrastScale = role === 'ambient' || role === 'hemi'
      ? 1 - Math.max(0, contrast - 1) * 0.2
      : 1 + Math.max(0, contrast - 1) * 0.4

    return baseIntensity * clampNumber(brightnessScale * contrastScale, 0.72, 1.32)
  }

  $: resolvedSolitudeSettings = resolveSolitudePresetSettings($solitudeEditorSettingsStore)
  $: manifest = baseManifest ? applySolitudeEditorSettings(baseManifest, resolvedSolitudeSettings) : null
  $: solitudeAtmosphereProfile = getSolitudeAtmosphereProfile(
    resolvedSolitudeSettings?.presets?.atmosphere ?? DEFAULT_SOLITUDE_ATMOSPHERE_PRESET,
  )
  $: resolvedRuntimeVisualStyle = buildSolitudeRuntimeVisualStyle({
    ...(manifest ?? {}),
    presets: resolvedSolitudeSettings?.presets ?? manifest?.presets,
  })
  $: if (manifest) {
    replaceRuntimeVisualStyle(resolvedRuntimeVisualStyle)
  }
  $: playerSpawnPoint = manifest?.spawn?.position ?? [0, 2.4, -24]
  $: waterEnabled = manifest?.features?.water ?? manifest?.water?.enabled ?? false
  $: activeSkyboxPreset = SKYBOX_PRESETS[manifest?.skyboxPreset as keyof typeof SKYBOX_PRESETS] ?? SKYBOX_PRESETS.observatory
  $: ambientParticlesEnabled = manifest?.features?.ambientParticles ?? manifest?.ambientParticles?.enabled ?? true
  $: keyLightCastsShadow = shouldEnableSceneShadows($qualityLevelStore, $qualitySettingsStore)
  $: shadowMapSize = Math.max(512, $qualitySettingsStore.shadowMapSize || 512)
  $: resolvedColorGrading = manifest?.style?.colorGrading ?? {
    saturation: 1,
    contrast: 1,
    brightness: 1,
    warmth: 1,
  }
  $: gradedAmbientColor = gradeSceneColor(solitudeLightingTheme.ambientColor, resolvedColorGrading)
  $: gradedHemisphereSkyColor = gradeSceneColor(solitudeLightingTheme.hemisphereSkyColor, resolvedColorGrading)
  $: gradedHemisphereGroundColor = gradeSceneColor(solitudeLightingTheme.hemisphereGroundColor, {
    ...resolvedColorGrading,
    brightness: (resolvedColorGrading.brightness ?? 1) * 0.92,
  })
  $: gradedKeyColor = gradeSceneColor(solitudeLightingTheme.keyColor, resolvedColorGrading)
  $: gradedFillColor = gradeSceneColor(solitudeLightingTheme.fillColor, resolvedColorGrading)
  $: gradedParticleColor = gradeSceneColor(manifest?.ambientParticles?.color ?? '#58e6ff', resolvedColorGrading)
  $: gradedParticleSecondaryColor = gradeSceneColor(manifest?.ambientParticles?.secondaryColor ?? '#ff4cd0', resolvedColorGrading)
  $: gradedWaterColor = gradeSceneColor(manifest?.water?.color ?? '#182f63', resolvedColorGrading)
  $: ambientLightIntensity = gradeLightIntensity(manifest?.lighting?.ambientIntensity ?? 0.46, 'ambient', resolvedColorGrading)
  $: hemisphereLightIntensity = gradeLightIntensity(0.42, 'hemi', resolvedColorGrading)
  $: keyLightIntensity = gradeLightIntensity(manifest?.lighting?.directionalLights?.[0]?.intensity ?? 0.96, 'key', resolvedColorGrading)
  $: fillLightIntensity = gradeLightIntensity(manifest?.lighting?.directionalLights?.[1]?.intensity ?? 0.34, 'fill', resolvedColorGrading)
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
    const baseColor = new THREE.Color(manifest?.style?.fog?.color ?? '#43206c')
    const baseDensity = manifest?.style?.fog?.density ?? 0.00092
    const heightFog = resolvedRuntimeVisualStyle.heightFog

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

    const heightInfluence = 1 - Math.min(
      1,
      Math.max(0, (playerPosition[1] - heightFog.floor) / Math.max(0.001, heightFog.ceiling - heightFog.floor)),
    )
    const blendedColor = baseColor
      .clone()
      .lerp(targetColor, strongestInfluence)
      .lerp(new THREE.Color(heightFog.color), heightInfluence * heightFog.colorInfluence)
    const blendedDensity = baseDensity
      + (targetDensity - baseDensity) * strongestInfluence
      + (heightFog.density * heightInfluence)
    return {
      color: `#${blendedColor.getHexString()}`,
      density: blendedDensity,
    }
  })()

  $: solitudeLightingTheme = solitudeAtmosphereProfile.lighting

  onMount(() => {
    void loadManifest().catch((error) => {
      console.error('❌ Solitude: Failed to load manifest:', error)
    })
    loadTimelineData()
  })

  onDestroy(() => {
    resetRuntimeVisualStyle()
  })
</script>

{#if manifest && terrainConfig}
  <LevelManager>
    <T.Group name={manifest.id ?? 'solitude-level'}>
      <Skybox
        path={activeSkyboxPreset.path}
        files={activeSkyboxPreset.files}
      />

      <T.AmbientLight color={gradedAmbientColor} intensity={ambientLightIntensity} />
      <T.HemisphereLight skyColor={gradedHemisphereSkyColor} groundColor={gradedHemisphereGroundColor} intensity={hemisphereLightIntensity} />
      <T.DirectionalLight
        position={solitudeLightingTheme.keyPosition}
        color={gradedKeyColor}
        intensity={keyLightIntensity}
        castShadow={keyLightCastsShadow}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow.camera.near={0.5}
        shadow.camera.far={320}
        shadow.camera.left={-180}
        shadow.camera.right={180}
        shadow.camera.top={180}
        shadow.camera.bottom={-180}
      />
      <T.DirectionalLight
        position={solitudeLightingTheme.fillPosition}
        color={gradedFillColor}
        intensity={fillLightIntensity}
        castShadow={false}
      />

      <SceneFogExp2
        color={effectiveFog.color}
        density={effectiveFog.density}
      />

      <Terrain
        config={terrainConfig}
        showVisualSurface={false}
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
          color={Number.parseInt(gradedWaterColor.replace('#', ''), 16)}
          opacity={manifest.water?.opacity ?? 0.86}
          enableAnimation={manifest.water?.enableAnimation ?? true}
          enableUnderwaterEffects={true}
          waterCollisionSize={[
            (manifest.water?.size?.width ?? 800) * 0.9,
            2,
            (manifest.water?.size?.height ?? 800) * 0.9,
          ]}
          underwaterFogDensity={manifest.water?.underwaterFogDensity ?? 0.1}
          underwaterFogColor={manifest.water?.underwaterFogColor ?? 0x081121}
          surfaceFogDensity={manifest.water?.surfaceFogDensity ?? 0.0012}
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
          color={gradedParticleColor}
          secondaryColor={gradedParticleSecondaryColor}
          size={(manifest.ambientParticles?.size ?? 1.15) * resolvedRuntimeVisualStyle.particles.sizeMultiplier}
          opacity={(manifest.ambientParticles?.opacity ?? 0.26) * resolvedRuntimeVisualStyle.particles.opacityMultiplier}
          driftSpeed={manifest.ambientParticles?.driftSpeed ?? 0.22}
          sway={manifest.ambientParticles?.sway ?? 0.85}
          intensity={1.1 + (resolvedRuntimeVisualStyle.screenFx.accentGlowIntensity * 1.8)}
          center={[0, 0, 0]}
          distribution={resolvedRuntimeVisualStyle.particles.distribution}
          blendMode={resolvedRuntimeVisualStyle.particles.blendMode}
          groundBandStrength={resolvedRuntimeVisualStyle.particles.groundBandStrength}
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
