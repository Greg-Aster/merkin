<script lang="ts">
import { onDestroy, onMount } from 'svelte'
import {
  type EditorSceneNode,
  type EditorState,
  editorStateStore,
  selectedEditorNodesStore,
  setControlsOverlayOpen,
} from './editorStore'

let editorState: EditorState | undefined
let selectedNodes: EditorSceneNode[] = []
let helpExpanded = false
let compactViewport = false

const unsubState = editorStateStore.subscribe(value => {
  editorState = value
})

const unsubSelected = selectedEditorNodesStore.subscribe(value => {
  selectedNodes = value
})

function updateViewportSize() {
  if (typeof window === 'undefined') return
  compactViewport = window.innerWidth <= 900
}

onMount(() => {
  updateViewportSize()
  if (compactViewport) {
    setControlsOverlayOpen(false)
  }
  window.addEventListener('resize', updateViewportSize)
})

onDestroy(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportSize)
  }
  unsubState()
  unsubSelected()
})

function toggleHelp() {
  helpExpanded = !helpExpanded
}

$: selectionLabel =
  selectedNodes.length === 0
    ? 'No selection'
    : selectedNodes.length === 1
      ? selectedNodes[0].name
      : `${selectedNodes.length} objects`

$: modeLabel =
  editorState?.objectToolMode === 'select'
    ? 'Select'
    : editorState?.transformMode === 'rotate'
      ? 'Rotate'
      : editorState?.transformMode === 'scale'
        ? 'Scale'
        : 'Move'

$: axisLabel =
  editorState?.transformAxis === 'all'
    ? 'All'
    : `${editorState?.transformAxis?.toUpperCase()}`

$: spaceLabel = editorState?.transformSpace === 'local' ? 'Local' : 'World'

$: workflowLabel =
  editorState?.viewportMode === 'playtest'
    ? 'Playtest'
    : editorState?.interactionMode === 'terrain'
      ? 'Terrain'
      : 'Object'

$: collisionOn = Boolean(editorState?.collisionOverlayEnabled)
$: modalActive = Boolean(editorState?.modalTransformActive)
</script>

{#if editorState?.enabled && editorState.controlsOverlayOpen}
  <div class="editor-status-bar" class:expanded={helpExpanded}>
    <div class="status-row">
      <span class="status-pill selection" title="Current selection">{selectionLabel}</span>
      <span class="status-pill mode">{workflowLabel} · {modeLabel}</span>
      <span class="status-pill axis">{spaceLabel} · {axisLabel}</span>
      {#if collisionOn}
        <span class="status-pill flag">Collision</span>
      {/if}
      {#if modalActive}
        <span class="status-pill flag accent">Modal</span>
      {/if}
      <button
        class="help-toggle"
        type="button"
        aria-expanded={helpExpanded}
        title="Toggle shortcut help"
        on:click={toggleHelp}
      >
        {helpExpanded ? 'Hide' : '?'}
      </button>
    </div>

    {#if helpExpanded}
      <div class="help-drawer">
        {#if editorState.viewportMode === 'playtest'}
          <span>Live player test of current scene state.</span>
          <span>Switch back to Edit to resume gizmos and selection.</span>
        {:else if editorState.interactionMode === 'terrain'}
          <span>LMB drag sculpts · Shift lowers (raise brush).</span>
          <span>Smooth evens terrain · Flatten samples start height.</span>
        {:else}
          <span>G / R / S — modal transform.</span>
          {#if modalActive}
            <span>LMB or Enter confirms · Esc or RMB cancels.</span>
          {:else}
            <span>Click object, drag gizmo handles.</span>
          {/if}
          <span>Alt + drag duplicates.</span>
          <span>B box select · C circle select · Shift + drag marquee.</span>
          <span>X / Y / Z axis lock · A select all · F frame · End ground snap.</span>
          <span>Ctrl/Cmd + G group · Ctrl/Cmd + Shift + G ungroup.</span>
        {/if}
        <span>Shift + Z toggles workbench / rendered lighting.</span>
        <span>Delete removes the current selection.</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .editor-status-bar {
    position: fixed;
    left: calc(21rem + 1.5rem);
    right: calc(21rem + 1.5rem);
    bottom: 0.6rem;
    max-width: min(48rem, calc(100vw - 44rem));
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.32rem;
    padding: 0.3rem 0.45rem;
    border-radius: 0.55rem;
    border: 1px solid rgba(126, 203, 255, 0.18);
    background: rgba(8, 14, 22, 0.62);
    color: #e8f5ff;
    backdrop-filter: blur(8px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
    pointer-events: none;
    z-index: 85;
    font-size: 0.7rem;
    line-height: 1.1;
  }

  .status-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.28rem;
    align-items: center;
    min-width: 0;
  }

  .status-pill {
    padding: 0.18rem 0.42rem;
    border-radius: 999px;
    background: rgba(126, 203, 255, 0.1);
    color: #bfe5ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .status-pill.selection {
    max-width: 18rem;
  }

  .status-pill.flag {
    background: rgba(126, 203, 255, 0.18);
    color: #d6f0ff;
  }

  .status-pill.flag.accent {
    background: rgba(255, 196, 126, 0.22);
    color: #ffe0b8;
  }

  .help-toggle {
    margin-left: auto;
    min-width: 1.7rem;
    padding: 0.16rem 0.5rem;
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.4rem;
    background: rgba(126, 203, 255, 0.08);
    color: rgba(232, 245, 255, 0.86);
    font: inherit;
    font-size: 0.7rem;
    cursor: pointer;
    pointer-events: auto;
  }

  .help-toggle:hover,
  .help-toggle[aria-expanded='true'] {
    background: rgba(126, 203, 255, 0.18);
  }

  .help-drawer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.55rem;
    padding-top: 0.32rem;
    border-top: 1px dashed rgba(126, 203, 255, 0.18);
    color: #9bc7e4;
    font-size: 0.7rem;
  }

  @media (max-width: 1280px) {
    .editor-status-bar {
      left: calc(19rem + 1.2rem);
      right: calc(19rem + 1.2rem);
      max-width: min(40rem, calc(100vw - 40rem));
    }
  }

  @media (max-width: 900px) {
    .editor-status-bar {
      left: 0.5rem;
      right: calc(min(26rem, 52vw) + 0.8rem);
      bottom: 0.45rem;
      max-width: none;
      margin: 0;
      padding: 0.26rem 0.4rem;
      font-size: 0.66rem;
    }

    .status-pill.selection {
      max-width: 9rem;
    }

    .help-drawer {
      display: none;
    }

    .editor-status-bar.expanded .help-drawer {
      display: flex;
    }
  }
</style>
