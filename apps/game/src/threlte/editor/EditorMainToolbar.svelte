<script lang="ts">
import type { EditorCommand } from './editorCommandRegistry'
import type {
  EditorInteractionMode,
  EditorObjectToolMode,
  EditorSpace,
  EditorTerrainBrushMode,
  EditorTransformAxis,
  EditorViewportLightingMode,
  EditorViewportMode,
  EditorViewportShadingMode,
} from './editorStore'

export let viewportMode: EditorViewportMode = 'edit'
export let interactionMode: EditorInteractionMode = 'objects'
export let objectToolMode: EditorObjectToolMode = 'translate'
export let transformSpace: EditorSpace = 'world'
export let transformAxis: EditorTransformAxis = 'all'
export let snappingEnabled = false
export let translateSnap = 0.5
export let rotateSnap = 15
export let scaleSnap = 0.1
export let surfaceSnapEnabled = false
export let surfaceSnapOffset = 0
export let viewportShadingMode: EditorViewportShadingMode = 'rendered'
export let viewportLightingMode: EditorViewportLightingMode = 'authored'
export let collisionOverlayEnabled = false
export let terrainModeAvailable = false
export let terrainBrushMode: EditorTerrainBrushMode = 'raise'
export let terrainBrushSize = 12
export let terrainBrushStrength = 0.45
export let terrainBrushFalloff = 0.65
export let commands: EditorCommand[] = []

export let onSetInteractionMode: (mode: EditorInteractionMode) => void =
  () => {}
export let onSetViewportMode: (mode: EditorViewportMode) => void = () => {}
export let onSetObjectToolMode: (mode: EditorObjectToolMode) => void = () => {}
export let onSetTransformSpace: (space: EditorSpace) => void = () => {}
export let onSetTransformAxis: (axis: EditorTransformAxis) => void = () => {}
export let onSetSnappingEnabled: (value: boolean) => void = () => {}
export let onSetTranslateSnap: (value: number) => void = () => {}
export let onSetRotateSnap: (value: number) => void = () => {}
export let onSetScaleSnap: (value: number) => void = () => {}
export let onSetSurfaceSnapEnabled: (value: boolean) => void = () => {}
export let onSetSurfaceSnapOffset: (value: number) => void = () => {}
export let onSetViewportShadingMode: (mode: EditorViewportShadingMode) => void =
  () => {}
export let onSetViewportLightingMode: (
  mode: EditorViewportLightingMode,
) => void = () => {}
export let onSetCollisionOverlayEnabled: (value: boolean) => void = () => {}
export let onSetTerrainBrushMode: (mode: EditorTerrainBrushMode) => void =
  () => {}
export let onSetTerrainBrushSize: (value: number) => void = () => {}
export let onSetTerrainBrushStrength: (value: number) => void = () => {}
export let onSetTerrainBrushFalloff: (value: number) => void = () => {}
export let onRunCommand: (commandId: string) => void = () => {}

let toolSettingsOpen = false
let bakeMenuOpen = false

const bakeCommandIds = [
  'bake-terrain',
  'generate-terrain-heightmap',
  'bake-terrain-collision',
  'cook-terrain-chunks',
  'cook-world-partition',
  'bake-mesh-collider',
  'validate-terrain-contract',
]

const objectTools: Array<{ id: EditorObjectToolMode; label: string }> = [
  { id: 'select', label: 'Select' },
  { id: 'translate', label: 'Move' },
  { id: 'rotate', label: 'Rotate' },
  { id: 'scale', label: 'Scale' },
]

const transformAxes: Array<{ id: EditorTransformAxis; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'x', label: 'X' },
  { id: 'y', label: 'Y' },
  { id: 'z', label: 'Z' },
]

function chooseObjectTool(mode: EditorObjectToolMode) {
  onSetInteractionMode('objects')
  onSetObjectToolMode(mode)
}

$: bakeCommands = bakeCommandIds
  .map(commandId => commands.find(command => command.id === commandId))
  .filter((command): command is EditorCommand => Boolean(command))

function runBakeCommand(command: EditorCommand) {
  if (!command.enabled) return
  bakeMenuOpen = false
  onRunCommand(command.id)
}
</script>

<div
  class:menu-open={bakeMenuOpen || toolSettingsOpen}
  class="editor-main-toolbar"
  aria-label="Editor tools"
>
  <div class="toolbar-group mode-group">
    <label>
      Mode
      <select value={viewportMode} on:change={(event) => onSetViewportMode((event.currentTarget as HTMLSelectElement).value as EditorViewportMode)}>
        <option value="edit">Edit</option>
        <option value="playtest">Playtest</option>
      </select>
    </label>
  </div>

  <div class="toolbar-group mode-group">
    <label>
      Target
      <select value={interactionMode} on:change={(event) => onSetInteractionMode((event.currentTarget as HTMLSelectElement).value as EditorInteractionMode)}>
        <option value="objects">Objects</option>
        <option value="terrain" disabled={!terrainModeAvailable}>Terrain</option>
      </select>
    </label>
  </div>

  {#if interactionMode === 'terrain'}
    <div class="toolbar-group brush-group">
      <button class:active={terrainBrushMode === 'raise'} on:click={() => onSetTerrainBrushMode('raise')}>Raise</button>
      <button class:active={terrainBrushMode === 'smooth'} on:click={() => onSetTerrainBrushMode('smooth')}>Smooth</button>
      <button class:active={terrainBrushMode === 'flatten'} on:click={() => onSetTerrainBrushMode('flatten')}>Flatten</button>
    </div>
  {:else}
    <div class="toolbar-group object-tool-group">
      <label>
        Tool
        <select value={objectToolMode} on:change={(event) => chooseObjectTool((event.currentTarget as HTMLSelectElement).value as EditorObjectToolMode)}>
          {#each objectTools as tool (tool.id)}
            <option value={tool.id}>{tool.label}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="toolbar-group">
      <label>
        Space
        <select value={transformSpace} on:change={(event) => onSetTransformSpace((event.currentTarget as HTMLSelectElement).value as EditorSpace)}>
          <option value="world">World</option>
          <option value="local">Local</option>
        </select>
      </label>
      <label>
        Axis
        <select value={transformAxis} on:change={(event) => onSetTransformAxis((event.currentTarget as HTMLSelectElement).value as EditorTransformAxis)}>
          {#each transformAxes as axis (axis.id)}
            <option value={axis.id}>{axis.label}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="toolbar-group snap-group">
      <label class="toolbar-check">
        <input type="checkbox" checked={snappingEnabled} on:change={(event) => onSetSnappingEnabled((event.currentTarget as HTMLInputElement).checked)} />
        Snap
      </label>
      <label class="toolbar-check">
        <input type="checkbox" checked={surfaceSnapEnabled} on:change={(event) => onSetSurfaceSnapEnabled((event.currentTarget as HTMLInputElement).checked)} />
        Ground
      </label>
    </div>
  {/if}

  <div class="toolbar-group viewport-group">
    <label>
      View
      <select value={viewportShadingMode} on:change={(event) => onSetViewportShadingMode((event.currentTarget as HTMLSelectElement).value as EditorViewportShadingMode)}>
        <option value="rendered">Rendered</option>
        <option value="solid">Solid</option>
        <option value="wireframe">Wire</option>
      </select>
    </label>
    <label>
      Light
      <select value={viewportLightingMode} on:change={(event) => onSetViewportLightingMode((event.currentTarget as HTMLSelectElement).value as EditorViewportLightingMode)}>
        <option value="authored">Authored</option>
        <option value="workbench">Workbench</option>
      </select>
    </label>
    <label class="toolbar-check">
      <input type="checkbox" checked={collisionOverlayEnabled} on:change={(event) => onSetCollisionOverlayEnabled((event.currentTarget as HTMLInputElement).checked)} />
      Collision
    </label>
  </div>

  <details class="toolbar-group toolbar-bake-menu" bind:open={bakeMenuOpen}>
    <summary>Bake</summary>
    <div class="settings-popover bake-popover">
      {#if bakeCommands.length}
        {#each bakeCommands as command (command.id)}
          <button
            class:disabled={!command.enabled}
            disabled={!command.enabled}
            title={command.enabled ? command.description : command.disabledReason ?? command.description}
            on:click={() => runBakeCommand(command)}
          >
            <span>{command.label}</span>
            <small>{command.enabled ? command.description : command.disabledReason ?? command.description}</small>
          </button>
        {/each}
      {:else}
        <div class="toolbar-empty">No bake commands registered.</div>
      {/if}
    </div>
  </details>

  <details class="toolbar-group toolbar-settings" bind:open={toolSettingsOpen}>
    <summary>Settings</summary>
    <div class="settings-popover">
      {#if interactionMode === 'terrain'}
        <label>
          Brush size
          <input type="number" min="1" step="1" value={terrainBrushSize} on:change={(event) => onSetTerrainBrushSize(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <label>
          Strength
          <input type="number" min="0.01" step="0.05" value={terrainBrushStrength} on:change={(event) => onSetTerrainBrushStrength(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <label>
          Falloff
          <input type="number" min="0" max="1" step="0.05" value={terrainBrushFalloff} on:change={(event) => onSetTerrainBrushFalloff(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
      {:else}
        <label>
          Move snap
          <input type="number" min="0.01" step="0.05" value={translateSnap} on:change={(event) => onSetTranslateSnap(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <label>
          Rotate snap
          <input type="number" min="0.1" step="1" value={rotateSnap} on:change={(event) => onSetRotateSnap(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <label>
          Scale snap
          <input type="number" min="0.01" step="0.05" value={scaleSnap} on:change={(event) => onSetScaleSnap(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <label>
          Surface offset
          <input type="number" step="0.05" value={surfaceSnapOffset} on:change={(event) => onSetSurfaceSnapOffset(Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
      {/if}
    </div>
  </details>
</div>

<style>
  .editor-main-toolbar {
    position: relative;
    z-index: 180;
    display: flex;
    flex-wrap: nowrap;
    gap: 0.42rem;
    align-items: center;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(126, 203, 255, 0.38) transparent;
    pointer-events: auto;
  }

  .editor-main-toolbar.menu-open {
    overflow: visible;
  }

  .editor-main-toolbar::-webkit-scrollbar {
    height: 0.35rem;
  }

  .editor-main-toolbar::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(126, 203, 255, 0.35);
  }

  .toolbar-group {
    position: relative;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.2rem;
    min-height: 2rem;
    padding: 0.22rem;
    border: 1px solid rgba(126, 203, 255, 0.2);
    border-radius: 0.55rem;
    background: rgba(9, 14, 24, 0.92);
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.26);
  }

  .toolbar-group label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: rgba(232, 245, 255, 0.78);
    font-size: 0.72rem;
    white-space: nowrap;
  }

  .toolbar-check {
    padding: 0 0.24rem;
  }

  .toolbar-group input[type='number'] {
    width: 3.15rem;
    border: 1px solid rgba(126, 203, 255, 0.14);
    border-radius: 0.38rem;
    background: rgba(7, 12, 18, 0.88);
    color: #ecf7ff;
    padding: 0.22rem 0.26rem;
    font-size: 0.76rem;
  }

  .toolbar-group select {
    border: 1px solid rgba(126, 203, 255, 0.14);
    border-radius: 0.38rem;
    background: rgba(7, 12, 18, 0.88);
    color: #ecf7ff;
    padding: 0.22rem 0.26rem;
    font-size: 0.76rem;
  }

  .toolbar-settings,
  .toolbar-bake-menu {
    position: relative;
    display: block;
  }

  .toolbar-settings[open],
  .toolbar-bake-menu[open] {
    z-index: 260;
  }

  .toolbar-settings summary,
  .toolbar-bake-menu summary {
    display: flex;
    align-items: center;
    min-height: 1.48rem;
    padding: 0 0.28rem;
    color: rgba(232, 245, 255, 0.82);
    font-size: 0.76rem;
    list-style: none;
    cursor: pointer;
  }

  .toolbar-settings summary::-webkit-details-marker,
  .toolbar-bake-menu summary::-webkit-details-marker {
    display: none;
  }

  .settings-popover {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 1rem;
    z-index: 270;
    display: grid;
    grid-template-columns: repeat(2, minmax(8rem, 1fr));
    gap: 0.45rem;
    width: min(24rem, calc(100vw - 2rem));
    padding: 0.6rem;
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.65rem;
    background: rgba(6, 10, 18, 0.98);
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.44);
  }

  .settings-popover label {
    justify-content: space-between;
  }

  .bake-popover {
    right: 0;
    left: auto;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.3rem;
    width: min(22rem, calc(100vw - 2rem));
    max-height: min(70vh, 34rem);
    overflow-y: auto;
  }

  .bake-popover button {
    display: grid;
    gap: 0.15rem;
    width: 100%;
    text-align: left;
  }

  .bake-popover button small {
    color: rgba(205, 228, 244, 0.62);
    font-size: 0.62rem;
    line-height: 1.2;
  }

  .bake-popover button.disabled {
    opacity: 0.55;
  }

  .toolbar-empty {
    color: rgba(205, 228, 244, 0.64);
    font-size: 0.72rem;
  }

  @media (max-width: 900px) {
    .editor-main-toolbar {
      gap: 0.32rem;
    }

    .toolbar-group {
      gap: 0.18rem;
    }

    .settings-popover {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
