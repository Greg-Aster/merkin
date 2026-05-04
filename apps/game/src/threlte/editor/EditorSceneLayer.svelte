<script lang="ts">
import { T } from '@threlte/core'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import EditorSceneBranch from './EditorSceneBranch.svelte'
import {
  loadEditorSceneDocument,
  loadImmediateEditorSceneDocument,
} from './editorSceneDocumentLoader'
import {
  editorNodesStore,
  editorRootNodesStore,
  editorStateStore,
  selectEditorNode,
  setEditorLevel,
  setEditorScene,
} from './editorStore'

const dispatch = createEventDispatcher()

export let levelId: string
export let editorEnabled = false
export let interactionSystem: any = null

let editorNodes = []
let rootNodes = []
let selectedNodeId: string | null = null
let selectedNodeIds: string[] = []
let activeLoadToken = 0

const unsubscribeNodes = editorNodesStore.subscribe(value => {
  editorNodes = value
})

const unsubscribeState = editorStateStore.subscribe(state => {
  selectedNodeId = state.selectedNodeId
  selectedNodeIds = state.selectedNodeIds
})

const unsubscribeRoots = editorRootNodesStore.subscribe(value => {
  rootNodes = value
})

async function loadEditorScene(level: string) {
  const loadToken = ++activeLoadToken
  setEditorLevel(level)

  const immediateScene = loadImmediateEditorSceneDocument(level, {
    includeLocalStorage: true,
  })
  setEditorScene(immediateScene.scene)

  try {
    const loadedScene = await loadEditorSceneDocument(level, {
      includeLocalStorage: true,
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
    })
    setEditorScene(fallbackScene.scene)
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

<T.Group name={`editor-scene-${levelId}`} userData={editorEnabled ? {} : { renderStyleSkip: true }}>
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
