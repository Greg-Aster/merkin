<script lang="ts">
import './editor-ui.css'
import { onDestroy } from 'svelte'
import {
  type EditorSceneNode,
  type EditorState,
  editorStateStore,
  selectedEditorNodesStore,
  setEditorViewportLightingMode,
  setTransformAxis,
  setTransformMode,
  setTransformSpace,
} from './editorStore'

let editorState: EditorState | undefined
let selectedNodes: EditorSceneNode[] = []

const unsubState = editorStateStore.subscribe(value => {
  editorState = value
})

const unsubSelected = selectedEditorNodesStore.subscribe(value => {
  selectedNodes = value
})

$: selectionLabel =
  selectedNodes.length === 0
    ? 'No selection'
    : selectedNodes.length === 1
      ? selectedNodes[0].name
      : `${selectedNodes.length} objects selected`

$: modeLabel =
  editorState?.transformMode === 'rotate'
    ? 'Rotate'
    : editorState?.transformMode === 'scale'
      ? 'Scale'
      : 'Move'

$: axisLabel =
  editorState?.transformAxis === 'all'
    ? 'All Axes'
    : `${editorState?.transformAxis?.toUpperCase()} Axis`

$: spaceLabel = editorState?.transformSpace === 'local' ? 'Local' : 'World'
$: interactionLabel = editorState?.modalTransformActive
  ? 'Modal Active'
  : 'Gizmo Ready'
$: workflowLabel =
  editorState?.interactionMode === 'terrain' ? 'Terrain Sculpt' : 'Object Edit'
$: collisionLabel = editorState?.collisionOverlayEnabled
  ? 'Collision On'
  : 'Collision Off'
$: lightingLabel =
  editorState?.viewportLightingMode === 'workbench' ? 'Workbench' : 'Rendered'

onDestroy(() => {
  unsubState()
  unsubSelected()
})
</script>

{#if editorState?.enabled}
  <div class="editor-controls-overlay">
    <div class="editor-controls-header">
      <div>
        <div class="title">Editor Controls</div>
        <div class="subtitle">{selectionLabel}</div>
      </div>
      <div class="state-pill">{workflowLabel} · {lightingLabel} · {collisionLabel} · {interactionLabel} · {modeLabel} · {spaceLabel} · {axisLabel}</div>
    </div>

    <div class="button-row compact-two-mode">
      <button class:active={editorState.viewportLightingMode === 'authored'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setEditorViewportLightingMode('authored')}>Rendered</button>
      <button class:active={editorState.viewportLightingMode === 'workbench'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setEditorViewportLightingMode('workbench')}>Workbench</button>
    </div>

    {#if editorState.interactionMode === 'objects'}
      <div class="button-row">
        <button class:active={editorState.transformMode === 'translate'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setTransformMode('translate')}>G Move</button>
        <button class:active={editorState.transformMode === 'rotate'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setTransformMode('rotate')}>R Rotate</button>
        <button class:active={editorState.transformMode === 'scale'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setTransformMode('scale')}>S Scale</button>
      </div>

      <div class="button-row compact">
        <button class:active={editorState.transformSpace === 'world'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setTransformSpace('world')}>World</button>
        <button class:active={editorState.transformSpace === 'local'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setTransformSpace('local')}>Local</button>
        <button class:active={editorState.transformAxis === 'all'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setTransformAxis('all')}>All</button>
        <button class:active={editorState.transformAxis === 'x'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setTransformAxis('x')}>X</button>
        <button class:active={editorState.transformAxis === 'y'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setTransformAxis('y')}>Y</button>
        <button class:active={editorState.transformAxis === 'z'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => setTransformAxis('z')}>Z</button>
      </div>
    {/if}

    <div class="legend">
      {#if editorState.interactionMode === 'terrain'}
        <span>LMB drag sculpts terrain in the observatory.</span>
        <span>Shift lowers while using the raise brush.</span>
        <span>Smooth evens the terrain · Flatten samples the start height.</span>
      {:else}
        <span>Press G, R, or S to start a modal transform.</span>
        {#if editorState.modalTransformActive}
          <span>LMB or Enter confirms · Esc or RMB cancels.</span>
        {:else}
          <span>Click object, then drag colored gizmo handles.</span>
        {/if}
      {/if}
      <span>Alt + drag duplicates.</span>
      <span>Shift + Z toggles rendered and workbench lighting.</span>
      <span>B box select · C circle select · Shift + drag marquee · X/Y/Z axis lock · A select all · F frame · End ground snap.</span>
      <span>Ctrl/Cmd + G group · Ctrl/Cmd + Shift + G ungroup.</span>
      <span>Circle select: drag LMB to add, Shift + drag to subtract, wheel changes radius, Esc exits.</span>
      <span>Delete removes the whole current selection.</span>
    </div>
  </div>
{/if}

<style>
  .editor-controls-overlay {
    position: fixed;
    left: 1rem;
    bottom: 1rem;
    width: min(34rem, calc(100vw - 2rem));
    padding: 0.9rem 1rem;
    border-radius: 0.8rem;
    border: 1px solid rgba(126, 203, 255, 0.24);
    background: rgba(8, 14, 22, 0.9);
    color: #e8f5ff;
    backdrop-filter: blur(10px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
    pointer-events: none;
    z-index: 85;
  }

  .editor-controls-header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: flex-start;
    margin-bottom: 0.7rem;
  }

  .title {
    font-weight: 700;
  }

  .subtitle {
    margin-top: 0.15rem;
    font-size: 0.8rem;
    color: #9bc7e4;
  }

  .state-pill {
    padding: 0.35rem 0.55rem;
    border-radius: 999px;
    background: rgba(126, 203, 255, 0.12);
    color: #bfe5ff;
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .button-row.compact-two-mode {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .button-row {
    margin-bottom: 0.45rem;
    pointer-events: auto;
  }

  .button-row.compact {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .legend {
    display: grid;
    gap: 0.2rem;
    margin-top: 0.5rem;
    font-size: 0.78rem;
    color: #9bc7e4;
  }
</style>
