<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core'
  import { Collider, RigidBody } from '@threlte/rapier'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import * as THREE from 'three'
  import ProceduralMesh from '../components/ProceduralMesh.svelte'
  import StarSprite from '../components/StarSprite.svelte'
  import GroundMistLayer from '../components/GroundMistLayer.svelte'
  import EditorColliderHelper from './EditorColliderHelper.svelte'
  import EditorNodeRenderContent from './EditorNodeRenderContent.svelte'
  import { qualityLevelStore } from '../features/performance/stores/performanceStore'
  import { getRuntimePropBudget } from '../features/performance/utils/runtimeSceneBudget'
  import { editorNodeViewportStateStore, editorStateStore } from './editorStore'
  import { gameActions } from '../stores/gameStateStore'
  import { registerEditorObject, unregisterEditorObject } from './editorRegistry'
  import type { EditorSceneNode } from './editorStore'

  const dispatch = createEventDispatcher()

  export let node: EditorSceneNode
  export let editorEnabled = false
  export let selected = false
  export let interactionSystem: any = null
  export let interactiveEnabled = false

  const { camera } = useThrelte()
  let group: THREE.Group
  let markerHovered = false
  let lightBurstGlow = 0
  let shockwaveIgnited = false
  let shockwaveIgnition = 0
  let animationTime = 0
  let viewportVisible = true
  let runtimeDistanceVisible = true
  let effectiveVisible = true
  let conversationFeaturePromise: Promise<typeof import('../features/conversation')> | null = null
  const nodeWorldPosition = new THREE.Vector3()
  let distanceCullAccumulator = 0
  const gameplayPointLightScale = 1

  function supportsShockwaveFireflyIgnition() {
    if (node.gameplay?.type !== 'firefly') return false
    const author = (node.gameplay.author ?? '').toLowerCase()
    const name = (node.name ?? '').toLowerCase()
    return node.id.includes('pillar-firefly') || author.includes('pillar firefly') || name.includes('pillar')
  }

  function isSolitudeFirefly() {
    return node.gameplay?.type === 'firefly' && node.id.startsWith('solitude-')
  }

  function resolveFireflyColor() {
    const authored = node.gameplay?.markerColor
    if (isSolitudeFirefly() && (!authored || authored === '#f5f1a8')) {
      return '#ff4658'
    }
    return authored ?? '#ff4658'
  }

  function resolveFireflySetting<T>(authored: T | undefined, legacyValue: T, tunedValue: T, fallbackValue: T) {
    if (isSolitudeFirefly() && (authored === undefined || authored === legacyValue)) {
      return tunedValue
    }
    return authored ?? fallbackValue
  }

  function resolveFireflyLightIntensity() {
    if (node.id === 'solitude-firefly') {
      return resolveFireflySetting(node.gameplay?.lightIntensity, 5, 1.45, 1.15)
    }
    return resolveFireflySetting(node.gameplay?.lightIntensity, 4, 1.15, 1.15)
  }

  function resolveFireflyLightDistance() {
    if (node.id === 'solitude-firefly') {
      return resolveFireflySetting(node.gameplay?.lightDistance, 2, 4.6, 4.6)
    }
    return resolveFireflySetting(node.gameplay?.lightDistance, 6, 4.6, 4.6)
  }

  function resolveFireflyLightDecay() {
    if (node.id === 'solitude-firefly') {
      return resolveFireflySetting(node.gameplay?.lightDecay, 2, 1.25, 1.25)
    }
    return resolveFireflySetting(node.gameplay?.lightDecay, 1.6, 1.25, 1.25)
  }

  function resolveFireflySpriteIntensity() {
    if (node.id === 'solitude-firefly') {
      return resolveFireflySetting(node.gameplay?.spriteIntensity, 1.95, 1.2, 1.15)
    }
    return resolveFireflySetting(node.gameplay?.spriteIntensity, 0.95, 1.15, 1.15)
  }

  function resolveFireflyTwinkleSpeed() {
    if (node.id === 'solitude-firefly') {
      return resolveFireflySetting(node.gameplay?.twinkleSpeed, 0.5, 0.9, 0.9)
    }
    return resolveFireflySetting(node.gameplay?.twinkleSpeed, 1.6, 0.9, 0.9)
  }

  function getActiveCamera(): THREE.Camera | null {
    const candidate = camera as THREE.Camera & { current?: THREE.Camera | null }
    const resolved = candidate?.current ?? candidate
    return resolved && resolved.position instanceof THREE.Vector3 ? resolved : null
  }

  function getPrimitiveColliderArgs() {
    if (node.kind !== 'primitive' || !node.primitive) return [0.5, 0.5, 0.5] as [number, number, number]

    const [scaleX = 1, scaleY = 1, scaleZ = 1] = node.scale

    if (node.primitive.geometry === 'box') {
      const [width = 1, height = 1, depth = 1] = node.primitive.args
      return [
        Math.abs(width * scaleX) / 2,
        Math.abs(height * scaleY) / 2,
        Math.abs(depth * scaleZ) / 2,
      ] as [number, number, number]
    }

    if (node.primitive.geometry === 'cylinder') {
      const [radiusTop = 0.5, radiusBottom = 0.5, height = 1] = node.primitive.args
      const radius = Math.max(Math.abs(radiusTop), Math.abs(radiusBottom))
      return [
        Math.max(0.05, radius * Math.abs(scaleX)),
        Math.max(0.05, Math.abs(height * scaleY) / 2),
        Math.max(0.05, radius * Math.abs(scaleZ)),
      ] as [number, number, number]
    }

    if (['octahedron', 'tetrahedron', 'icosahedron', 'dodecahedron'].includes(node.primitive.geometry)) {
      const [radius = 0.5] = node.primitive.args
      return [
        Math.max(0.05, Math.abs(radius * scaleX)),
        Math.max(0.05, Math.abs(radius * scaleY)),
        Math.max(0.05, Math.abs(radius * scaleZ)),
      ] as [number, number, number]
    }

    if (node.primitive.geometry === 'torus') {
      const [radius = 0.5, tube = 0.2] = node.primitive.args
      const outerRadius = Math.abs(radius) + Math.abs(tube)
      return [
        Math.max(0.05, outerRadius * Math.abs(scaleX)),
        Math.max(0.05, Math.abs(tube * scaleY)),
        Math.max(0.05, outerRadius * Math.abs(scaleZ)),
      ] as [number, number, number]
    }

    return [0.5, 0.5, 0.5] as [number, number, number]
  }

  function hasPhysicsBody() {
    return !!node.collision && (node.kind === 'primitive' || node.kind === 'asset' || node.kind === 'prefab')
  }

  function getRigidBodyType() {
    return node.physics?.bodyType ?? 'fixed'
  }

  function getColliderArgs() {
    if (node.collision?.size) {
      return [
        Math.abs(node.collision.size[0]) / 2,
        Math.abs(node.collision.size[1]) / 2,
        Math.abs(node.collision.size[2]) / 2,
      ] as [number, number, number]
    }

    if (node.kind === 'primitive') {
      return getPrimitiveColliderArgs()
    }

    return [
      Math.max(0.05, Math.abs(node.scale[0]) / 2),
      Math.max(0.05, Math.abs(node.scale[1]) / 2),
      Math.max(0.05, Math.abs(node.scale[2]) / 2),
    ] as [number, number, number]
  }

  useTask((delta) => {
    animationTime += delta
    lightBurstGlow = Math.max(0, lightBurstGlow - delta * 1.25)
    shockwaveIgnition = THREE.MathUtils.damp(shockwaveIgnition, shockwaveIgnited ? 1 : 0, 4.5, delta)

    const activeCamera = getActiveCamera()
    if (editorEnabled || !activeCamera || !group || !supportsRuntimeDistanceCulling()) return

    distanceCullAccumulator += delta
    if (distanceCullAccumulator < 0.2) return
    distanceCullAccumulator = 0

    group.getWorldPosition(nodeWorldPosition)

    const distanceToCamera = activeCamera.position.distanceTo(nodeWorldPosition)
    runtimeDistanceVisible = distanceToCamera <= getRuntimeCullDistance()
  })

  function loadConversationFeature() {
    if (!conversationFeaturePromise) {
      conversationFeaturePromise = import('../features/conversation')
    }

    return conversationFeaturePromise
  }

  async function startFireflyDialogue() {
    const { conversationActions } = await loadConversationFeature()
    const npcId = `editor-firefly-${node.id}`
    const personality = {
      id: npcId,
      name: node.gameplay?.author || node.gameplay?.title || node.name,
      species: 'Firefly',
      behavior: { defaultMood: 'peaceful' },
    }

    conversationActions.startReadOnlyConversation(
      npcId,
      personality,
      node.gameplay?.body || node.gameplay?.excerpt || 'You are alone here.',
      7000,
    )
    gameActions.recordInteraction('editor_firefly_click', npcId)
  }

  function registerInteractiveMarker(sprite: THREE.Sprite) {
    if (!interactiveEnabled || !interactionSystem?.registerInteractiveObject || !node.gameplay) return

    interactionSystem.registerInteractiveObject({
      id: `editor-node-${node.id}`,
      sprite,
      type: 'object',
      data: node,
      index: 0,
      handlers: {
        onClick: () => {
          if (node.gameplay?.type === 'portal' && node.gameplay.targetLevelId) {
            dispatch('portalTransition', { levelId: node.gameplay.targetLevelId })
            return
          }

          if (node.gameplay?.type === 'firefly') {
            void startFireflyDialogue()
            return
          }

          if (node.gameplay?.type === 'note') {
            dispatch('noteRead', {
              title: node.gameplay.title || node.name,
              author: node.gameplay.author || 'Recovered Fragment',
              location: node.gameplay.location || 'Sci-Fi Room',
              excerpt: node.gameplay.excerpt || '',
              body: node.gameplay.body || node.gameplay.excerpt || '',
            })
          }
        },
        onHover: (_data: EditorSceneNode, hovered: boolean) => {
          markerHovered = hovered
        },
        onLightBurst: (_data: EditorSceneNode, burst: { strength: number }) => {
          lightBurstGlow = Math.max(lightBurstGlow, 0.45 + burst.strength * 0.75)
          if (supportsShockwaveFireflyIgnition()) {
            shockwaveIgnited = true
          }
        },
      },
    })
  }

  function getFireflyMotionOffset() {
    const hoverHeight = resolveFireflySetting(node.gameplay?.hoverHeight, 0.36, 0.28, 0.28)
    const bobAmplitude = resolveFireflySetting(node.gameplay?.bobAmplitude, 0.14, 0.08, 0.08)
    const bobSpeed = resolveFireflySetting(node.gameplay?.bobSpeed, 1.4, 0.55, 0.55)
    const wanderEnabled = resolveFireflySetting(node.gameplay?.wanderEnabled, false, true, true)
    const wanderRadius = resolveFireflySetting(node.gameplay?.wanderRadius, 0.35, 0.16, 0.16)
    const wanderSpeed = resolveFireflySetting(node.gameplay?.wanderSpeed, 0.45, 0.18, 0.18)
    const basePhase = Array.from(node.id).reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0) * 0.0175

    return [
      wanderEnabled ? Math.sin(animationTime * wanderSpeed + basePhase) * wanderRadius : 0,
      hoverHeight + Math.sin(animationTime * bobSpeed + basePhase * 0.5) * bobAmplitude,
      wanderEnabled ? Math.cos(animationTime * wanderSpeed + basePhase) * wanderRadius : 0,
    ] as [number, number, number]
  }

  function supportsRuntimeDistanceCulling() {
    return (
      node.kind === 'asset'
      || node.kind === 'prefab'
      || node.kind === 'primitive'
      || node.kind === 'light'
    )
  }

  function getRuntimeCullDistance() {
    const baseDistance = getRuntimePropBudget($qualityLevelStore).cullDistance

    switch (node.kind) {
      case 'light':
        return baseDistance * 0.4
      case 'primitive':
        return baseDistance * 0.85
      default:
        return baseDistance
    }
  }

  $: viewportVisible = $editorNodeViewportStateStore.get(node.id)?.effectiveVisible ?? node.visible
  $: effectiveVisible = viewportVisible && runtimeDistanceVisible
  $: fireflyBaseColor = resolveFireflyColor()
  $: fireflyIgnitionColor = (() => {
    const baseColor = new THREE.Color(fireflyBaseColor)
    const ignitedColor = new THREE.Color('#ff1830')
    return `#${baseColor.lerp(ignitedColor, shockwaveIgnition).getHexString()}`
  })()

  $: if (group) {
    registerEditorObject(node.id, group)
    group.visible = effectiveVisible
    group.position.set(...node.position)
    group.rotation.set(...node.rotation)
    group.scale.set(...node.scale)
  }

  onDestroy(() => {
    if (interactionSystem?.unregisterInteractiveObject) {
      interactionSystem.unregisterInteractiveObject(`editor-node-${node.id}`)
    }
    unregisterEditorObject(node.id)
  })
</script>

<T.Group bind:ref={group} visible={effectiveVisible}>
  {#if !editorEnabled && hasPhysicsBody() && node.collision?.shape === 'cuboid' && viewportVisible}
    <RigidBody
      type={getRigidBodyType()}
      gravityScale={node.physics?.gravityScale ?? 1}
      canSleep={node.physics?.canSleep ?? true}
      ccd={node.physics?.ccd ?? false}
      linearDamping={node.physics?.linearDamping ?? 0}
      angularDamping={node.physics?.angularDamping ?? 0}
      lockRotations={node.physics?.lockRotations ?? false}
      lockTranslations={node.physics?.lockTranslations ?? false}
    >
      <Collider
        shape="cuboid"
        args={getColliderArgs()}
        friction={node.collision.friction ?? 0.7}
        restitution={node.collision.restitution ?? 0}
        sensor={node.collision.sensor ?? false}
      />
      <EditorNodeRenderContent {node} {editorEnabled} />
    </RigidBody>
  {:else}
    <EditorNodeRenderContent {node} {editorEnabled} />
  {/if}

  {#if hasPhysicsBody() && node.collision?.shape === 'cuboid' && editorEnabled && $editorStateStore.collisionOverlayEnabled}
    <EditorColliderHelper shape="cuboid" args={getColliderArgs()} />
  {/if}

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

  {#if node.gameplay}
    {#if node.gameplay.type === 'firefly'}
      {@const fireflyMotionOffset = getFireflyMotionOffset()}
      {@const baseLightIntensity = resolveFireflyLightIntensity()}
      {@const baseSpriteIntensity = resolveFireflySpriteIntensity()}
      {@const lightDrivenSpriteIntensity = baseSpriteIntensity * Math.max(0.75, baseLightIntensity / 1.15)}
      {@const shockwaveIntensityMultiplier = supportsShockwaveFireflyIgnition() ? 1 + shockwaveIgnition * 12 : 1}
      {@const shockwaveDistanceMultiplier = supportsShockwaveFireflyIgnition() ? 1 + shockwaveIgnition * 1.1 : 1}
      {@const shockwaveSpriteSizeMultiplier = supportsShockwaveFireflyIgnition() ? 1 + shockwaveIgnition * 0.55 : 1}
      {@const shockwaveSpriteIntensity = supportsShockwaveFireflyIgnition()
        ? Math.max(lightDrivenSpriteIntensity * (1 + shockwaveIgnition * 5.2), 1 + shockwaveIgnition * 2.6)
        : lightDrivenSpriteIntensity}
      <T.PointLight
        position={fireflyMotionOffset}
        color={fireflyIgnitionColor}
        intensity={(markerHovered ? Math.max(baseLightIntensity * 1.18, baseLightIntensity) : baseLightIntensity) * shockwaveIntensityMultiplier * gameplayPointLightScale}
        distance={resolveFireflyLightDistance() * shockwaveDistanceMultiplier}
        decay={resolveFireflyLightDecay()}
      />
      <StarSprite
        position={fireflyMotionOffset}
        color={fireflyIgnitionColor}
        size={(node.gameplay.markerSize ?? 0.58) * (markerHovered ? 1.12 : 1 + lightBurstGlow * 0.08) * shockwaveSpriteSizeMultiplier}
        intensity={Math.max(markerHovered ? Math.max(shockwaveSpriteIntensity * 1.2, 1.05) : shockwaveSpriteIntensity, shockwaveSpriteIntensity + lightBurstGlow * 0.55)}
        twinkleSpeed={resolveFireflyTwinkleSpeed()}
        animationOffset={animationTime}
        starType="sparkle"
        isKeyElement={true}
        enableTwinkle={true}
        opacity={1}
        isClickable={interactiveEnabled}
        isHovered={markerHovered}
        onSpriteReady={registerInteractiveMarker}
      />
    {:else if node.gameplay.type === 'audio-region'}
      <ProceduralMesh
        geometry="box"
        args={[1, 1, 1]}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[1, 1, 1]}
        color={node.gameplay.markerColor ?? '#7ecbff'}
        emissive={node.gameplay.markerColor ?? '#7ecbff'}
        emissiveIntensity={selected || markerHovered ? 0.4 : 0.12}
        metalness={0.08}
        roughness={0.92}
        transparent={true}
        opacity={0.12}
      />
      <ProceduralMesh
        geometry="torus"
        args={[0.5, 0.03, 12, 24]}
        position={[0, Math.max(0.3, node.scale[1] * 0.5), 0]}
        rotation={[Math.PI / 2, animationTime * 0.35, 0]}
        scale={[1, 1, 1]}
        color={node.gameplay.markerColor ?? '#7ecbff'}
        emissive={node.gameplay.markerColor ?? '#7ecbff'}
        emissiveIntensity={0.35}
        metalness={1}
        roughness={0.04}
        transparent={true}
        opacity={0.45}
      />
    {:else if node.gameplay.type === 'fog-volume'}
      <ProceduralMesh
        geometry="box"
        args={[1, 1, 1]}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={[1, 1, 1]}
        color={node.gameplay.fogColor ?? node.gameplay.markerColor ?? '#cfdcff'}
        emissive={node.gameplay.fogColor ?? node.gameplay.markerColor ?? '#cfdcff'}
        emissiveIntensity={selected || markerHovered ? 0.28 : 0.08}
        metalness={0.02}
        roughness={1}
        transparent={true}
        opacity={0.1}
      />
      <ProceduralMesh
        geometry="torus"
        args={[0.5, 0.02, 12, 24]}
        position={[0, Math.max(0.3, node.scale[1] * 0.5), 0]}
        rotation={[Math.PI / 2, 0, Math.sin(animationTime * 0.3) * 0.25]}
        scale={[1, 1, 1]}
        color={node.gameplay.fogColor ?? node.gameplay.markerColor ?? '#cfdcff'}
        emissive={node.gameplay.fogColor ?? node.gameplay.markerColor ?? '#cfdcff'}
        emissiveIntensity={0.2}
        metalness={1}
        roughness={0.05}
        transparent={true}
        opacity={0.38}
      />
    {:else if node.gameplay.type === 'mist-region'}
      {#if editorEnabled}
        <ProceduralMesh
          geometry="box"
          args={[1, 1, 1]}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={[1, 1, 1]}
          color={node.gameplay.mistColor ?? '#b992ff'}
          emissive={node.gameplay.mistColor ?? '#b992ff'}
          emissiveIntensity={selected || markerHovered ? 0.34 : 0.1}
          metalness={0.02}
          roughness={1}
          transparent={true}
          opacity={0.12}
        />
        <ProceduralMesh
          geometry="torus"
          args={[0.6, 0.025, 12, 24]}
          position={[0, 0.18, 0]}
          rotation={[Math.PI / 2, 0, Math.sin(animationTime * 0.3) * 0.25]}
          scale={[1, 1, 1]}
          color={node.gameplay.mistColor ?? '#b992ff'}
          emissive={node.gameplay.mistColor ?? '#b992ff'}
          emissiveIntensity={0.24}
          metalness={1}
          roughness={0.05}
          transparent={true}
          opacity={0.42}
        />
      {:else}
        <GroundMistLayer
          enabled={true}
          color={node.gameplay.mistColor ?? '#241557'}
          opacity={node.gameplay.mistOpacity ?? 0.14}
          layers={Math.max(1, Math.round(node.gameplay.mistLayers ?? 3))}
          baseHeight={0}
          heightStep={node.gameplay.mistSpacing ?? 0.45}
          scale={node.gameplay.mistScale ?? 360}
          driftSpeed={node.gameplay.mistDriftSpeed ?? 0.05}
        />
      {/if}
    {:else}
      <ProceduralMesh
        geometry="torus"
        args={[node.gameplay.type === 'portal' ? 1.4 : 0.38, node.gameplay.type === 'portal' ? 0.035 : 0.018, 12, 28]}
        position={[0, node.gameplay.type === 'portal' ? 1.05 : 0.1, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, 1, 1]}
        color={node.gameplay.markerColor ?? '#7ecbff'}
        emissive={node.gameplay.markerColor ?? '#7ecbff'}
        emissiveIntensity={Math.max(markerHovered ? 1.1 : 0.48, 0.48 + lightBurstGlow)}
        metalness={1}
        roughness={0.03}
        transparent={true}
        opacity={0.68}
      />

      <StarSprite
        position={[0, node.gameplay.type === 'portal' ? 1.12 : 0.12, 0]}
        color={node.gameplay.markerColor ?? '#7ecbff'}
        size={(node.gameplay.markerSize ?? 0.7) * (markerHovered ? 1.15 : 1 + lightBurstGlow * 0.12)}
        intensity={Math.max(markerHovered ? 1.05 : 0.85, 0.85 + lightBurstGlow * 0.8)}
        twinkleSpeed={1.2}
        animationOffset={0}
        enableTwinkle={true}
        opacity={1}
        isClickable={interactiveEnabled}
        isHovered={markerHovered}
        onSpriteReady={registerInteractiveMarker}
      />
    {/if}
  {/if}

  <slot />
</T.Group>
