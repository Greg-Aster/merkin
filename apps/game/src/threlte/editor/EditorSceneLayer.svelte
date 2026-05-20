<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
import { createEditorRuntimePreviewPlan } from '../engine/editorRuntimePreviewPlan'
import { resolveRuntimePlayerSettings } from '../engine/runtimePlayerSettings'
import { loadRuntimeSceneDocument } from '../engine/runtimeSceneDocumentLoader'
import { adaptSceneDocumentToLevelDefinition } from '../engine/sceneAdapter'
import type {
  ActorDefinition,
  GeneratedCollisionProduct,
  LevelDefinition,
} from '../engine/types'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import EditorPlayerSpawnMarker from './EditorPlayerSpawnMarker.svelte'
import EditorPlaytestPlayerMarker from './EditorPlaytestPlayerMarker.svelte'
import EditorSceneBranch from './EditorSceneBranch.svelte'
import EditorSelectionOutlineOverlay from './EditorSelectionOutlineOverlay.svelte'
import EditorViewportShadingOverlay from './EditorViewportShadingOverlay.svelte'
import {
  loadEditorSceneDocument,
  loadImmediateEditorSceneDocument,
} from './editorSceneDocumentLoader'
import {
  editorNodesStore,
  editorRootNodesStore,
  editorSceneStore,
  editorStateStore,
  selectEditorNode,
  setEditorLevel,
  setEditorScene,
} from './editorStore'
import type { EditorSceneDocument } from './editorTypes'

const dispatch = createEventDispatcher()

export let levelId: string
export let editorEnabled = false
export let playtestEnabled = false
export let playtestRuntimeReady = false
export let interactionSystem: any = null
export let playtestPlayerPosition: [number, number, number] | null = null
export let playtestPlayerRotation: [number, number, number] | null = null

let editorNodes = []
let rootNodes = []
let editorScene: EditorSceneDocument | null = null
let playtestLevelDefinition: LevelDefinition | null = null
let playtestActors: ActorDefinition[] = []
let playtestRootActors: ActorDefinition[] = []
let lastPlaytestScene: EditorSceneDocument | null = null
let lastPlaytestEnabled = false
let lastCollisionOverlayEnabled = false
let lastPlaytestLevelId = ''
let RuntimeActorBranchComponent: any = null
let runtimeActorBranchComponentPromise: Promise<void> | null = null
let runtimeCollisionProductsByActorId = new Map<
  string,
  GeneratedCollisionProduct
>()
let runtimeCollisionProductsLevelId = ''
let runtimeCollisionProductsRequestLevelId = ''
let runtimeCollisionProductsLoadToken = 0
let selectedNodeId: string | null = null
let selectedNodeIds: string[] = []
let collisionOverlayEnabled = false
let activeLoadToken = 0
let playtestSpawnSignature = ''
let playtestReadySignature = ''
let playtestReadyToken = 0
let runtimePreviewSceneReady = false
let runtimePreviewPlan = createEditorRuntimePreviewPlan({
  editorEnabled,
  playtestEnabled,
  collisionOverlayEnabled,
})
let runtimeActorsCanRender = false
let runtimePreviewOwnsAuthoring = false
let authoringInteractiveEnabled = false
let renderAuthoringVisuals = true
let renderAuthoringGameplay = true

const unsubscribeNodes = editorNodesStore.subscribe(value => {
  editorNodes = value
})

const unsubscribeState = editorStateStore.subscribe(state => {
  selectedNodeId = state.selectedNodeId
  selectedNodeIds = state.selectedNodeIds
  collisionOverlayEnabled = Boolean(state.collisionOverlayEnabled)
})

const unsubscribeRoots = editorRootNodesStore.subscribe(value => {
  rootNodes = value
})

const unsubscribeScene = editorSceneStore.subscribe(value => {
  editorScene = value
})

async function loadEditorScene(level: string) {
  const loadToken = ++activeLoadToken
  setEditorLevel(level)

  const immediateScene = loadImmediateEditorSceneDocument(level, {
    includeLocalStorage: true,
    preferLocalStorage: true,
  })
  setEditorScene(immediateScene.scene)

  try {
    const loadedScene = await loadEditorSceneDocument(level, {
      includeLocalStorage: true,
      preferLocalStorage: true,
    })
    if (loadToken !== activeLoadToken) return
    setEditorScene(loadedScene.scene)
    setRuntimeDiagnostic('scenePersistence', {
      level: loadedScene.source === 'disk' ? 'ready' : 'warning',
      message:
        loadedScene.source === 'disk'
          ? `Loaded editor scene for ${level} from disk.`
          : `Using ${loadedScene.source} editor scene state for ${level}.`,
    })
  } catch (error) {
    if (loadToken !== activeLoadToken) return
    console.warn(
      'Editor scene disk load unavailable, falling back to packaged editor scene.',
      error,
    )
    setRuntimeDiagnostic('scenePersistence', {
      level: 'warning',
      message: `Editor scene disk load unavailable for ${level}; using packaged editor scene fallback.`,
    })
    const fallbackScene = loadImmediateEditorSceneDocument(level, {
      includeLocalStorage: true,
      preferLocalStorage: true,
    })
    setEditorScene(fallbackScene.scene)
  }
}

function toFiniteVec3(value: unknown): [number, number, number] | null {
  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(component => Number.isFinite(component))
  ) {
    return [value[0], value[1], value[2]]
  }

  return null
}

function dispatchEditorPlaytestSpawn() {
  if (!playtestEnabled || !editorScene || editorScene.levelId !== levelId)
    return

  const levelSettings = editorScene.settings?.level ?? {}
  const position = toFiniteVec3(levelSettings.spawn?.position)
  if (!position) {
    setRuntimeDiagnostic('editorPlaytest', {
      label: 'Editor Playtest',
      level: 'error',
      message: `${levelId}: live playtest needs a finite authoring spawn position.`,
      meta: { levelId },
    })
    return
  }

  const rotation = toFiniteVec3(levelSettings.spawn?.rotation) ?? [0, 0, 0]
  const signature = JSON.stringify({
    levelId,
    position,
    rotation,
    player: levelSettings.player ?? null,
    updatedAt: editorScene.updatedAt,
  })
  if (signature === playtestSpawnSignature) return
  playtestSpawnSignature = signature

  dispatch('editorPlaytestSpawn', {
    levelId,
    position,
    rotation,
    reason: 'editor_playtest',
    metadata: {
      levelName: levelId,
      player: resolveRuntimePlayerSettings(levelSettings.player),
    },
  })
}

function clearPlaytestRuntimeScene() {
  playtestLevelDefinition = null
  playtestActors = []
  playtestRootActors = []
  runtimePreviewSceneReady = false
  playtestReadySignature = ''
  playtestReadyToken += 1
}

function collectGeneratedCollisionProducts(input: {
  levelDefinition: LevelDefinition
  runtimeProducts?: GeneratedCollisionProduct[]
}) {
  const products = new Map<string, GeneratedCollisionProduct>()

  for (const product of input.runtimeProducts ?? []) {
    products.set(product.actorId, product)
  }

  for (const actor of input.levelDefinition.actors) {
    const product = actor.physics?.collision.generatedProduct
    if (product) products.set(product.actorId, product)
  }

  return products
}

async function loadRuntimeCollisionProducts(level: string) {
  const loadToken = ++runtimeCollisionProductsLoadToken

  try {
    const loadedScene = await loadRuntimeSceneDocument(level)
    if (loadToken !== runtimeCollisionProductsLoadToken) return

    runtimeCollisionProductsByActorId = collectGeneratedCollisionProducts({
      levelDefinition: loadedScene.levelDefinition,
      runtimeProducts:
        loadedScene.runtimeManifest.runtime.generatedCollisionProducts,
    })
    runtimeCollisionProductsLevelId = level

    if (runtimeCollisionProductsByActorId.size === 0) {
      setRuntimeDiagnostic('editorCollisionProducts', {
        label: 'Editor Collision Products',
        level: 'warning',
        message: `${level}: cooked runtime scene has no generated collision products; overlay/playtest will not mount fake colliders.`,
        meta: { levelId: level, productCount: 0 },
      })
    }

    syncPlaytestRuntimeScene()
  } catch (error) {
    if (loadToken !== runtimeCollisionProductsLoadToken) return

    runtimeCollisionProductsByActorId = new Map()
    runtimeCollisionProductsLevelId = ''
    setRuntimeDiagnostic('editorCollisionProducts', {
      label: 'Editor Collision Products',
      level: 'warning',
      message:
        error instanceof Error
          ? `${level}: generated collision products unavailable for editor overlay/playtest. ${error.message}`
          : `${level}: generated collision products unavailable for editor overlay/playtest.`,
      meta: { levelId: level },
    })
    syncPlaytestRuntimeScene()
  }
}

async function waitForRuntimeActorMountGate(token: number) {
  await tick()
  await tick()
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

  return (
    token === playtestReadyToken &&
    playtestEnabled &&
    RuntimeActorBranchComponent &&
    editorScene?.levelId === levelId &&
    playtestLevelDefinition
  )
}

function scheduleEditorPlaytestReady() {
  if (
    !playtestEnabled ||
    !RuntimeActorBranchComponent ||
    !editorScene ||
    !playtestLevelDefinition ||
    editorScene.levelId !== levelId
  ) {
    return
  }

  const signature = JSON.stringify({
    levelId,
    updatedAt: playtestLevelDefinition.updatedAt,
    version: playtestLevelDefinition.version,
    actorCount: playtestActors.length,
  })
  if (signature === playtestReadySignature) return

  playtestReadySignature = signature
  const token = ++playtestReadyToken
  void waitForRuntimeActorMountGate(token).then(isReady => {
    if (!isReady || !playtestLevelDefinition || !editorScene) return

    dispatch('editorPlaytestReady', {
      levelId,
      source: 'editor-live-playtest',
      metadata: {
        actorCount: playtestActors.length,
        player: resolveRuntimePlayerSettings(
          editorScene.settings?.level?.player,
        ),
      },
    })
  })
}

function loadRuntimeActorBranchComponent() {
  if (RuntimeActorBranchComponent || runtimeActorBranchComponentPromise) {
    return runtimeActorBranchComponentPromise
  }

  runtimeActorBranchComponentPromise = import(
    '../levels/RuntimeActorBranch.svelte'
  )
    .then(module => {
      RuntimeActorBranchComponent = module.default
    })
    .catch(error => {
      runtimeActorBranchComponentPromise = null
      setRuntimeDiagnostic('editorPlaytestRender', {
        label: 'Editor Playtest Render',
        level: 'error',
        message:
          error instanceof Error
            ? error.message
            : `${levelId}: live playtest could not load the runtime actor renderer.`,
        meta: { levelId },
      })
    })

  return runtimeActorBranchComponentPromise
}

function syncPlaytestRuntimeScene() {
  if (
    !runtimePreviewPlan.runtimeActors.mount ||
    !editorScene ||
    editorScene.levelId !== levelId
  ) {
    clearPlaytestRuntimeScene()
    return
  }

  try {
    const nextLevelDefinition = adaptSceneDocumentToLevelDefinition(
      editorScene,
      {
        generatedCollisionProductsByActorId:
          runtimeCollisionProductsLevelId === levelId
            ? runtimeCollisionProductsByActorId
            : undefined,
      },
    )
    playtestLevelDefinition = nextLevelDefinition
    playtestActors = nextLevelDefinition.actors
    playtestRootActors = playtestActors.filter(actor => !actor.parentId)
    runtimePreviewSceneReady = true
    setRuntimeDiagnostic('editorPlaytestRender', {
      label: 'Editor Playtest Render',
      level: 'ready',
      message: `${levelId}: editor collision overlay rendering ${playtestActors.length} actor(s) through the runtime actor path.`,
      meta: {
        levelId,
        previewMode: runtimePreviewPlan.mode,
        runtimeActors: runtimePreviewPlan.runtimeActors,
        authoring: runtimePreviewPlan.authoring,
        actorCount: playtestActors.length,
        rootActorCount: playtestRootActors.length,
        sceneVersion: playtestLevelDefinition.version,
        updatedAt: playtestLevelDefinition.updatedAt,
      },
    })

    const collisionActors = playtestActors.filter(
      actor => actor.physics?.collision,
    )
    const missingGeneratedProductActorIds = collisionActors
      .filter(actor => !actor.physics?.collision.generatedProduct)
      .map(actor => actor.id)
    const mountedGeneratedProductActorIds = collisionActors
      .filter(actor => actor.physics?.collision.generatedProduct)
      .map(actor => actor.id)

    setRuntimeDiagnostic('editorCollisionProducts', {
      label: 'Editor Collision Products',
      level: missingGeneratedProductActorIds.length > 0 ? 'warning' : 'ready',
      message:
        missingGeneratedProductActorIds.length > 0
          ? `${levelId}: ${missingGeneratedProductActorIds.length} collision actor(s) have no current generated product; overlay/playtest will not mount fake colliders.`
          : `${levelId}: editor overlay/playtest using ${mountedGeneratedProductActorIds.length} generated collision product(s).`,
      meta: {
        levelId,
        runtimeProductLevelId: runtimeCollisionProductsLevelId,
        runtimeProductCount: runtimeCollisionProductsByActorId.size,
        collisionActorCount: collisionActors.length,
        mountedGeneratedProductActorIds,
        missingGeneratedProductActorIds: missingGeneratedProductActorIds.slice(
          0,
          50,
        ),
      },
    })
  } catch (error) {
    clearPlaytestRuntimeScene()
    setRuntimeDiagnostic('editorPlaytestRender', {
      label: 'Editor Playtest Render',
      level: 'error',
      message:
        error instanceof Error
          ? error.message
          : `${levelId}: live playtest could not adapt the editor scene.`,
      meta: { levelId },
    })
  }
}

let previousLevelId: string | null = null

$: if (levelId && levelId !== previousLevelId) {
  previousLevelId = levelId
  playtestSpawnSignature = ''
  runtimeCollisionProductsRequestLevelId = ''
  runtimeCollisionProductsLevelId = ''
  runtimeCollisionProductsByActorId = new Map()
  void loadEditorScene(levelId)
}

$: runtimePreviewPlan = createEditorRuntimePreviewPlan({
  editorEnabled,
  playtestEnabled,
  collisionOverlayEnabled,
})

$: runtimeActorsCanRender =
  runtimePreviewSceneReady && Boolean(RuntimeActorBranchComponent)

$: runtimePreviewOwnsAuthoring =
  runtimePreviewPlan.mode === 'runtime-preview' &&
  (runtimePreviewPlan.levelRuntime.ownsRuntimeActors
    ? playtestRuntimeReady
    : runtimeActorsCanRender)

$: authoringInteractiveEnabled = runtimePreviewOwnsAuthoring
  ? runtimePreviewPlan.authoring.interactive
  : runtimePreviewPlan.mode === 'runtime-preview'
    ? false
    : runtimePreviewPlan.authoring.interactive

$: renderAuthoringVisuals = runtimePreviewOwnsAuthoring
  ? runtimePreviewPlan.authoring.renderVisuals
  : true

$: renderAuthoringGameplay = runtimePreviewOwnsAuthoring
  ? runtimePreviewPlan.authoring.renderGameplay
  : true

$: if (
  playtestEnabled &&
  editorScene &&
  !runtimePreviewPlan.levelRuntime.ownsReadiness
) {
  dispatchEditorPlaytestSpawn()
}

$: if (runtimePreviewPlan.runtimeActors.mount && !RuntimeActorBranchComponent) {
  void loadRuntimeActorBranchComponent()
}

$: if (
  runtimePreviewPlan.runtimeActors.mount &&
  levelId &&
  levelId !== runtimeCollisionProductsRequestLevelId
) {
  runtimeCollisionProductsRequestLevelId = levelId
  void loadRuntimeCollisionProducts(levelId)
}

$: if (
  editorScene !== lastPlaytestScene ||
  playtestEnabled !== lastPlaytestEnabled ||
  collisionOverlayEnabled !== lastCollisionOverlayEnabled ||
  levelId !== lastPlaytestLevelId
) {
  lastPlaytestScene = editorScene
  lastPlaytestEnabled = playtestEnabled
  lastCollisionOverlayEnabled = collisionOverlayEnabled
  lastPlaytestLevelId = levelId
  syncPlaytestRuntimeScene()
}

$: if (!playtestEnabled) {
  playtestSpawnSignature = ''
  playtestReadySignature = ''
  playtestReadyToken += 1
}

$: if (
  playtestEnabled &&
  !runtimePreviewPlan.levelRuntime.ownsReadiness &&
  RuntimeActorBranchComponent &&
  playtestLevelDefinition
) {
  scheduleEditorPlaytestReady()
}

$: if (editorEnabled && editorScene?.levelId === levelId) {
  dispatch('editorSceneSettingsChange', {
    levelId,
    settings: editorScene.settings ?? {},
  })
}

onMount(() => {
  if (levelId) {
    void loadEditorScene(levelId)
  }
})

onDestroy(() => {
  unsubscribeNodes()
  unsubscribeRoots()
  unsubscribeScene()
  unsubscribeState()
  selectEditorNode(null)
})
</script>

<T.Group name={`editor-scene-${levelId}`} userData={editorEnabled ? {} : { renderStyleSkip: true }}>
  {#if editorEnabled}
    <T.GridHelper args={[200, 80, '#3a5266', '#243241']} position={[0, -0.01, 0]} />
    <T.AxesHelper args={[5]} position={[0, 0.02, 0]} />
    {#if !playtestEnabled}
      <EditorPlayerSpawnMarker />
      <EditorPlaytestPlayerMarker
        position={playtestPlayerPosition}
        rotation={playtestPlayerRotation}
      />
    {/if}
  {/if}

  {#if playtestEnabled && runtimeActorsCanRender}
    {#if RuntimeActorBranchComponent}
      {#each playtestRootActors as actor (actor.id)}
        <svelte:component
          this={RuntimeActorBranchComponent}
          {actor}
          actors={playtestActors}
          {levelId}
          {interactionSystem}
          interactiveEnabled={runtimePreviewPlan.runtimeActors.interactive}
          collisionOnly={runtimePreviewPlan.runtimeActors.collisionOnly}
          on:portalTransition={(event) => dispatch('portalTransition', event.detail)}
          on:noteRead={(event) => dispatch('noteRead', event.detail)}
        />
      {/each}
    {/if}
  {/if}

  {#if runtimePreviewPlan.mode !== 'runtime-preview'}
    {#if collisionOverlayEnabled && RuntimeActorBranchComponent}
      {#each playtestRootActors as actor (actor.id)}
        <svelte:component
          this={RuntimeActorBranchComponent}
          {actor}
          actors={playtestActors}
          {levelId}
          interactionSystem={null}
          interactiveEnabled={false}
          collisionOnly={true}
        />
      {/each}
    {/if}
  {/if}

  {#if editorEnabled && runtimePreviewPlan.authoring.mount}
    {#each rootNodes as node (node.id)}
      <EditorSceneBranch
        node={node}
        nodes={editorNodes}
        {editorEnabled}
        {selectedNodeId}
        {selectedNodeIds}
        sceneSettings={editorScene?.settings ?? null}
        {interactionSystem}
        interactiveEnabled={authoringInteractiveEnabled}
        {renderAuthoringVisuals}
        {renderAuthoringGameplay}
        on:portalTransition={(event) => dispatch('portalTransition', event.detail)}
        on:noteRead={(event) => dispatch('noteRead', event.detail)}
      />
    {/each}
  {/if}

  {#if editorEnabled && selectedNodeIds.length > 0}
    <EditorSelectionOutlineOverlay {selectedNodeId} {selectedNodeIds} />
  {/if}

  {#if editorEnabled}
    <EditorViewportShadingOverlay />
  {/if}
</T.Group>
