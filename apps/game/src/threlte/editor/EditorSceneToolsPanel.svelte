<script lang="ts">
  export let levelId = ''
  export let pendingLevelId = ''
  export let editorLevelOptions: Array<{ id: string, label: string, deployed: boolean, status: string }> = []
  export let newLevelTitle = ''
  export let newLevelIdInput = ''
  export let newLevelTemplateId = ''
  export let canUndo = false
  export let canRedo = false
  export let interactionMode = 'objects'
  export let viewportLightingMode = 'authored'
  export let collisionOverlayEnabled = false
  export let terrainBrushMode = 'raise'
  export let terrainBrushSize = 24
  export let terrainBrushStrength = 0.35
  export let terrainBrushFalloff = 0.55
  export let transformMode = 'translate'
  export let transformSpace = 'world'
  export let transformAxis = 'all'
  export let snappingEnabled = false
  export let translateSnap = 1
  export let rotateSnap = 15
  export let scaleSnap = 0.1
  export let surfaceSnapEnabled = false
  export let surfaceSnapOffset = 0

  export let onUndo: () => void = () => {}
  export let onRedo: () => void = () => {}
  export let onSwitchLevel: () => void = () => {}
  export let onCreateLevel: () => void = () => {}
  export let onSetInteractionMode: (mode: string) => void = () => {}
  export let onSetViewportLightingMode: (mode: string) => void = () => {}
  export let onSetCollisionOverlayEnabled: (value: boolean) => void = () => {}
  export let onSetTerrainBrushMode: (mode: string) => void = () => {}
  export let onSetTerrainBrushSize: (value: number) => void = () => {}
  export let onSetTerrainBrushStrength: (value: number) => void = () => {}
  export let onSetTerrainBrushFalloff: (value: number) => void = () => {}
  export let onSetTransformMode: (mode: string) => void = () => {}
  export let onSetTransformSpace: (mode: string) => void = () => {}
  export let onSetTransformAxis: (axis: string) => void = () => {}
  export let onSetSnappingEnabled: (value: boolean) => void = () => {}
  export let onSetTranslateSnap: (value: number) => void = () => {}
  export let onSetRotateSnap: (value: number) => void = () => {}
  export let onSetScaleSnap: (value: number) => void = () => {}
  export let onSetSurfaceSnapEnabled: (value: boolean) => void = () => {}
  export let onSetSurfaceSnapOffset: (value: number) => void = () => {}
</script>

<div class="editor-section">
  <div class="label">History</div>
  <div class="button-row compact">
    <button disabled={!canUndo} on:click={onUndo}>Undo</button>
    <button disabled={!canRedo} on:click={onRedo}>Redo</button>
  </div>
</div>

<div class="editor-section">
  <div class="label">Level</div>
  <div class="button-row level-switch-row">
    <select class="text-input" bind:value={pendingLevelId}>
      {#each editorLevelOptions as option (option.id)}
        <option value={option.id}>{option.label} {option.deployed ? '• deployed' : '• stored'} {option.status !== 'active' ? `• ${option.status}` : ''}</option>
      {/each}
    </select>
    <button on:click={onSwitchLevel} disabled={pendingLevelId === levelId}>Go</button>
  </div>
  <div class="save-message">Switching autosaves the current editor scene locally first.</div>
</div>

<div class="editor-section">
  <div class="label">New Level</div>
  <input class="text-input" bind:value={newLevelTitle} placeholder="Display name" />
  <input class="text-input editor-mt-input" bind:value={newLevelIdInput} placeholder="level-id" />
  <select class="text-input editor-mt-input" bind:value={newLevelTemplateId}>
    <option value={levelId}>Current Scene</option>
    {#each editorLevelOptions as option (option.id)}
      <option value={option.id}>{option.label}</option>
    {/each}
  </select>
  <button class="full editor-mt-md" on:click={onCreateLevel}>Create Level</button>
  <div class="save-message">Creates a new scene-backed level file, adds it to the registry, and opens it in the editor.</div>
</div>

<div class="editor-section">
  <div class="label">Workflow</div>
  <div class="button-row compact-two-columns">
    <button class:active={interactionMode === 'objects'} on:click={() => onSetInteractionMode('objects')}>Objects</button>
    <button class:active={interactionMode === 'terrain'} on:click={() => onSetInteractionMode('terrain')} disabled={levelId !== 'observatory'}>Terrain</button>
  </div>
  <div class="button-row compact-two-columns editor-mt-sm">
    <button class:active={viewportLightingMode === 'authored'} on:click={() => onSetViewportLightingMode('authored')}>Rendered</button>
    <button class:active={viewportLightingMode === 'workbench'} on:click={() => onSetViewportLightingMode('workbench')}>Workbench</button>
  </div>
  <label class="checkbox"><input type="checkbox" checked={collisionOverlayEnabled} on:change={(event) => onSetCollisionOverlayEnabled((event.currentTarget as HTMLInputElement).checked)} /> Collision Overlay</label>
  {#if levelId !== 'observatory'}
    <div class="save-message">Terrain sculpting is currently wired for the observatory terrain.</div>
  {/if}
</div>

{#if levelId === 'observatory'}
  <div class="editor-section">
    <div class="label">Terrain Sculpt</div>
    <div class="button-row">
      <button class:active={terrainBrushMode === 'raise'} on:click={() => onSetTerrainBrushMode('raise')}>Raise / Lower</button>
      <button class:active={terrainBrushMode === 'smooth'} on:click={() => onSetTerrainBrushMode('smooth')}>Smooth</button>
      <button class:active={terrainBrushMode === 'flatten'} on:click={() => onSetTerrainBrushMode('flatten')}>Flatten</button>
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Brush Size</div>
      <input class="tuple-input" type="number" min="1" step="1" value={terrainBrushSize} on:change={(event) => onSetTerrainBrushSize(Number((event.currentTarget as HTMLInputElement).value))} />
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Brush Strength</div>
      <input class="tuple-input" type="number" min="0.01" step="0.05" value={terrainBrushStrength} on:change={(event) => onSetTerrainBrushStrength(Number((event.currentTarget as HTMLInputElement).value))} />
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Brush Falloff</div>
      <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={terrainBrushFalloff} on:change={(event) => onSetTerrainBrushFalloff(Number((event.currentTarget as HTMLInputElement).value))} />
    </div>
    <div class="save-message">LMB drags terrain. Hold Shift while sculpting to lower with the raise brush.</div>
  </div>
{/if}

<div class="editor-section">
  <div class="label">Transform</div>
  <div class="button-row">
    <button class:active={transformMode === 'translate'} on:click={() => onSetTransformMode('translate')}>Move</button>
    <button class:active={transformMode === 'rotate'} on:click={() => onSetTransformMode('rotate')}>Rotate</button>
    <button class:active={transformMode === 'scale'} on:click={() => onSetTransformMode('scale')}>Scale</button>
  </div>
  <div class="button-row compact">
    <button class:active={transformSpace === 'world'} on:click={() => onSetTransformSpace('world')}>World</button>
    <button class:active={transformSpace === 'local'} on:click={() => onSetTransformSpace('local')}>Local</button>
  </div>
  <div class="button-row compact">
    <button class:active={transformAxis === 'all'} on:click={() => onSetTransformAxis('all')}>All</button>
    <button class:active={transformAxis === 'x'} on:click={() => onSetTransformAxis('x')}>X</button>
    <button class:active={transformAxis === 'y'} on:click={() => onSetTransformAxis('y')}>Y</button>
    <button class:active={transformAxis === 'z'} on:click={() => onSetTransformAxis('z')}>Z</button>
  </div>
  <label class="checkbox"><input type="checkbox" checked={snappingEnabled} on:change={(event) => onSetSnappingEnabled((event.currentTarget as HTMLInputElement).checked)} /> Snapping</label>
  <div class="tuple-group">
    <div class="tuple-label">Move Snap</div>
    <input class="tuple-input" type="number" min="0.01" step="0.05" value={translateSnap} on:change={(event) => onSetTranslateSnap(Number((event.currentTarget as HTMLInputElement).value))} />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Rotate Snap</div>
    <input class="tuple-input" type="number" min="0.1" step="1" value={rotateSnap} on:change={(event) => onSetRotateSnap(Number((event.currentTarget as HTMLInputElement).value))} />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Scale Snap</div>
    <input class="tuple-input" type="number" min="0.01" step="0.05" value={scaleSnap} on:change={(event) => onSetScaleSnap(Number((event.currentTarget as HTMLInputElement).value))} />
  </div>
  <label class="checkbox"><input type="checkbox" checked={surfaceSnapEnabled} on:change={(event) => onSetSurfaceSnapEnabled((event.currentTarget as HTMLInputElement).checked)} /> Ground Snap</label>
  <div class="tuple-group">
    <div class="tuple-label">Ground Offset</div>
    <input class="tuple-input" type="number" step="0.05" value={surfaceSnapOffset} on:change={(event) => onSetSurfaceSnapOffset(Number((event.currentTarget as HTMLInputElement).value))} />
  </div>
  <div class="save-message">Blender-style: G move, R rotate, S scale, X/Y/Z axis lock. Snap values now apply to gizmo drags and modal transforms. End ground snap.</div>
</div>
