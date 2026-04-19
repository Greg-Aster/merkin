<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { T } from '@threlte/core'
  import EditorSceneBranch from './EditorSceneBranch.svelte'
  import {
    createEmptyScene,
    editorNodesStore,
    editorRootNodesStore,
    editorStateStore,
    setEditorScene,
    loadSceneFromLocalStorage,
    selectEditorNode,
    setEditorLevel,
    type EditorSceneDocument,
  } from './editorStore'
  import { createDefaultSceneForLevel } from './defaultScenes'
  import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
  import { EDITOR_API_BASE } from '@config/editorApi'

  const dispatch = createEventDispatcher()

  export let levelId: string
  export let editorEnabled = false
  export let interactionSystem: any = null

  let editorNodes = []
  let rootNodes = []
  let selectedNodeId: string | null = null
  let selectedNodeIds: string[] = []
  let activeLoadToken = 0

  const unsubscribeNodes = editorNodesStore.subscribe((value) => {
    editorNodes = value
  })

  const unsubscribeState = editorStateStore.subscribe((state) => {
    selectedNodeId = state.selectedNodeId
    selectedNodeIds = state.selectedNodeIds
  })

  const unsubscribeRoots = editorRootNodesStore.subscribe((value) => {
    rootNodes = value
  })

  function getSceneUpdatedAt(scene: { updatedAt?: string } | null | undefined) {
    if (!scene?.updatedAt) return 0
    const timestamp = Date.parse(scene.updatedAt)
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  function getPreferredLoadedScene(level: string, diskScene: EditorSceneDocument | null) {
    const localScene = loadSceneFromLocalStorage(level)

    if (diskScene && localScene) {
      return getSceneUpdatedAt(localScene) >= getSceneUpdatedAt(diskScene)
        ? localScene
        : diskScene
    }

    if (diskScene) {
      return diskScene
    }

    return localScene ?? null
  }

  async function loadEditorScene(level: string) {
    const loadToken = ++activeLoadToken
    setEditorLevel(level)

    const immediateScene = getPreferredLoadedScene(level, null) ?? createDefaultSceneForLevel(level) ?? createEmptyScene(level)
    setEditorScene(immediateScene)

    let diskScene = null

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/editor-scene/load?levelId=${encodeURIComponent(level)}`)
      if (loadToken !== activeLoadToken) return
      if (response.ok) {
        const payload = await response.json()
        if (payload?.success && payload.scene) {
          diskScene = payload.scene
          setRuntimeDiagnostic('scenePersistence', {
            level: 'ready',
            message: `Loaded editor scene for ${level} from disk.`,
          })
        }
      }
    } catch (error) {
      if (loadToken !== activeLoadToken) return
      console.warn('Editor scene disk load unavailable, falling back to local storage.', error)
      setRuntimeDiagnostic('scenePersistence', {
        level: 'warning',
        message: `Editor scene disk load unavailable for ${level}; using local storage fallback.`,
      })
    }

    if (loadToken !== activeLoadToken) return
    const stored = getPreferredLoadedScene(level, diskScene)
    const fallbackScene = createDefaultSceneForLevel(level) ?? createEmptyScene(level)
    setEditorScene(stored ?? fallbackScene)
    if (!diskScene) {
      setRuntimeDiagnostic('scenePersistence', {
        level: stored ? 'warning' : 'idle',
        message: stored
          ? `Using local editor scene state for ${level}.`
          : `Using default editor scene template for ${level}.`,
      })
    }
  }

  let previousLevelId: string | null = null

  $: if (levelId && levelId !== previousLevelId) {
    previousLevelId = levelId
    void loadEditorScene(levelId)
  }

  onMount(() => {
    if (levelId) {
      void loadEditorScene(levelId)
    }
  })

  onDestroy(() => {
    unsubscribeNodes()
    unsubscribeRoots()
    unsubscribeState()
    selectEditorNode(null)
  })
</script>

<T.Group name={`editor-scene-${levelId}`}>
  {#if editorEnabled}
    <T.GridHelper args={[200, 80, '#3a5266', '#243241']} position={[0, -0.01, 0]} />
    <T.AxesHelper args={[5]} position={[0, 0.02, 0]} />
  {/if}

  {#each rootNodes as node (node.id)}
    <EditorSceneBranch
      node={node}
      nodes={editorNodes}
      {editorEnabled}
      {selectedNodeId}
      {selectedNodeIds}
      {interactionSystem}
      interactiveEnabled={!editorEnabled}
      on:portalTransition={(event) => dispatch('portalTransition', event.detail)}
      on:noteRead={(event) => dispatch('noteRead', event.detail)}
    />
  {/each}
</T.Group>
