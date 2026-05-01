<script lang="ts">
import { getLevelCollisionWorkflow } from '../engine/levelCollisionWorkflow'
import type {
  LevelCollisionBudget,
  LevelCollisionDefaultPolicy,
} from '../engine/sceneDocumentTypes'
import type { TerrainRuntimeComponentSource } from '../features/terrain'

export let levelId = ''
export let pendingLevelId = ''
export let editorLevelOptions: Array<{
  id: string
  label: string
  deployed: boolean
  status: string
}> = []
export let newLevelTitle = ''
export let newLevelIdInput = ''
export let newLevelTemplateId = ''
export let canUndo = false
export let canRedo = false
export let interactionMode = 'objects'
export let viewportLightingMode = 'authored'
export let collisionOverlayEnabled = false
export let collisionDefaultPolicy: LevelCollisionDefaultPolicy =
  'lightweight-auto'
export let collisionBudget: LevelCollisionBudget = 'mobile'
export let terrainBrushMode = 'raise'
export let terrainBrushSize = 24
export let terrainBrushStrength = 0.35
export let terrainBrushFalloff = 0.55
export let terrainCollisionSettings: {
  source?: 'baked-heightmap' | 'scene-authored' | 'none'
  runtimeSource?: TerrainRuntimeComponentSource
  manifestUrl?: string
  heightmapUrl?: string
  heightmapResolution?: number
  sourceAssetUrl?: string
  sourceNodeId?: string
  sourceName?: string
  sourceTriangleCount?: number
  colliderUrl?: string
  metadataUrl?: string
  colliderResolution?: number
  triangleCount?: number
  vertexCount?: number
  autoBakeOnTerrainChange?: boolean
  dirty?: boolean
  lastGeneratedAt?: string
  heightOverrideCount?: number
  chunksPath?: string
  chunkGrid?: number
  chunkCount?: number
} | null = null
export let terrainCollisionBakePending = false
export let terrainHeightmapGeneratePending = false
export let terrainChunkCookPending = false
export let worldPartitionCookPending = false
export let selectedTerrainSourceName = ''
export let selectedTerrainSourceAssetUrl = ''
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
export let onSetCollisionDefaultPolicy: (
  value: LevelCollisionDefaultPolicy,
) => void = () => {}
export let onSetCollisionBudget: (value: LevelCollisionBudget) => void =
  () => {}
export let onSetTerrainBrushMode: (mode: string) => void = () => {}
export let onSetTerrainBrushSize: (value: number) => void = () => {}
export let onSetTerrainBrushStrength: (value: number) => void = () => {}
export let onSetTerrainBrushFalloff: (value: number) => void = () => {}
export let onSetTerrainAutoBake: (value: boolean) => void = () => {}
export let onBakeTerrainCollision: () => void = () => {}
export let onGenerateTerrainHeightmap: () => void = () => {}
export let onCookTerrainChunks: () => void = () => {}
export let onCookWorldPartition: () => void = () => {}
export let onSetTransformMode: (mode: string) => void = () => {}
export let onSetTransformSpace: (mode: string) => void = () => {}
export let onSetTransformAxis: (axis: string) => void = () => {}
export let onSetSnappingEnabled: (value: boolean) => void = () => {}
export let onSetTranslateSnap: (value: number) => void = () => {}
export let onSetRotateSnap: (value: number) => void = () => {}
export let onSetScaleSnap: (value: number) => void = () => {}
export let onSetSurfaceSnapEnabled: (value: boolean) => void = () => {}
export let onSetSurfaceSnapOffset: (value: number) => void = () => {}

$: levelCollisionWorkflow = getLevelCollisionWorkflow(levelId)
$: terrainCollisionSource =
  terrainCollisionSettings?.source ??
  (levelCollisionWorkflow.terrainCollision === 'heightmap'
    ? 'baked-heightmap'
    : levelCollisionWorkflow.terrainCollision)
$: hasBakedTerrainWorkflow =
  terrainCollisionSource === 'baked-heightmap' ||
  Boolean(terrainCollisionSettings?.manifestUrl)
$: terrainSculptingAvailable =
  Boolean(levelCollisionWorkflow.terrainSculpting) || hasBakedTerrainWorkflow
$: terrainBakeToolsAvailable =
  terrainSculptingAvailable || Boolean(selectedTerrainSourceAssetUrl)
</script>

<div class="editor-section">
  <div class="label">History</div>
  <div class="button-row compact">
    <button disabled={!canUndo} data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onUndo}>Undo</button>
    <button disabled={!canRedo} data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onRedo}>Redo</button>
  </div>
</div>

<div class="editor-section">
  <div class="label">Level</div>
  <div class="button-row level-switch-row">
    <select class="text-input" bind:value={pendingLevelId} data-sfx-focus="focus-soft">
      {#each editorLevelOptions as option (option.id)}
        <option value={option.id}>{option.label} {option.deployed ? '• deployed' : '• stored'} {option.status !== 'active' ? `• ${option.status}` : ''}</option>
      {/each}
    </select>
    <button on:click={onSwitchLevel} disabled={pendingLevelId === levelId} data-sfx-hover="hover-emphasis" data-sfx-click="confirm">Go</button>
  </div>
  <div class="save-message">Switching autosaves the current editor scene locally first.</div>
</div>

<div class="editor-section">
  <div class="label">New Level</div>
  <input class="text-input" bind:value={newLevelTitle} placeholder="Display name" data-sfx-focus="focus-soft" />
  <input class="text-input editor-mt-input" bind:value={newLevelIdInput} placeholder="level-id" data-sfx-focus="focus-soft" />
  <select class="text-input editor-mt-input" bind:value={newLevelTemplateId} data-sfx-focus="focus-soft">
    <option value={levelId}>Current Scene</option>
    {#each editorLevelOptions as option (option.id)}
      <option value={option.id}>{option.label}</option>
    {/each}
  </select>
  <button class="full editor-mt-md" data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onCreateLevel}>Create Level</button>
  <div class="save-message">Creates a new scene-backed level file, adds it to the registry, and opens it in the editor.</div>
</div>

<div class="editor-section">
  <div class="label">Workflow</div>
  <div class="button-row compact-two-columns">
    <button class:active={interactionMode === 'objects'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetInteractionMode('objects')}>Objects</button>
    <button class:active={interactionMode === 'terrain'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetInteractionMode('terrain')} disabled={!terrainSculptingAvailable}>Terrain</button>
  </div>
  <div class="button-row compact-two-columns editor-mt-sm">
    <button class:active={viewportLightingMode === 'authored'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetViewportLightingMode('authored')}>Rendered</button>
    <button class:active={viewportLightingMode === 'workbench'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetViewportLightingMode('workbench')}>Workbench</button>
  </div>
  <label class="checkbox"><input type="checkbox" checked={collisionOverlayEnabled} data-sfx-click="soft" on:change={(event) => onSetCollisionOverlayEnabled((event.currentTarget as HTMLInputElement).checked)} /> Collision Overlay</label>
  <div class="button-row compact-three-columns editor-mt-sm">
    <button class:active={collisionDefaultPolicy === 'lightweight-auto'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionDefaultPolicy('lightweight-auto')}>Auto</button>
    <button class:active={collisionDefaultPolicy === 'authored-only'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionDefaultPolicy('authored-only')}>Authored</button>
    <button class:active={collisionDefaultPolicy === 'none'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionDefaultPolicy('none')}>Off</button>
  </div>
  <div class="button-row compact-three-columns editor-mt-sm">
    <button class:active={collisionBudget === 'mobile'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionBudget('mobile')}>Mobile</button>
    <button class:active={collisionBudget === 'balanced'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionBudget('balanced')}>Balanced</button>
    <button class:active={collisionBudget === 'desktop'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetCollisionBudget('desktop')}>Desktop</button>
  </div>
  <div class="save-message">Collision source: {terrainCollisionSource}{terrainCollisionSettings?.dirty ? ' - terrain bake needed' : ''}</div>
  <div class="save-message">Terrain component data: {terrainCollisionSettings?.runtimeSource ?? (terrainSculptingAvailable ? 'built-in-manifest' : 'scene-authored')}</div>
  {#if !terrainBakeToolsAvailable}
    <div class="save-message">Select a mesh asset to start a baked terrain workflow for this level.</div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">World Partition</div>
  <button class="full" disabled={worldPartitionCookPending} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onCookWorldPartition}>
    {worldPartitionCookPending ? 'Cooking Partition...' : 'Cook Actor Partition'}
  </button>
  <div class="save-message">Cooks visual-only actor roots into spatial runtime cells. Collision, gameplay, lights, audio, and never-cull actors stay resident.</div>
</div>

{#if terrainBakeToolsAvailable}
  <div class="editor-section">
    <div class="label">Terrain Sculpt</div>
    <label class="checkbox"><input type="checkbox" checked={terrainCollisionSettings?.autoBakeOnTerrainChange ?? false} data-sfx-click="soft" on:change={(event) => onSetTerrainAutoBake((event.currentTarget as HTMLInputElement).checked)} /> Auto Bake Collision</label>
    <div class="button-row">
      <button class:active={terrainBrushMode === 'raise'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTerrainBrushMode('raise')}>Raise / Lower</button>
      <button class:active={terrainBrushMode === 'smooth'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTerrainBrushMode('smooth')}>Smooth</button>
      <button class:active={terrainBrushMode === 'flatten'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTerrainBrushMode('flatten')}>Flatten</button>
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Brush Size</div>
      <input class="tuple-input" type="number" min="1" step="1" value={terrainBrushSize} data-sfx-focus="focus-soft" on:change={(event) => onSetTerrainBrushSize(Number((event.currentTarget as HTMLInputElement).value))} />
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Brush Strength</div>
      <input class="tuple-input" type="number" min="0.01" step="0.05" value={terrainBrushStrength} data-sfx-focus="focus-soft" on:change={(event) => onSetTerrainBrushStrength(Number((event.currentTarget as HTMLInputElement).value))} />
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Brush Falloff</div>
      <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={terrainBrushFalloff} data-sfx-focus="focus-soft" on:change={(event) => onSetTerrainBrushFalloff(Number((event.currentTarget as HTMLInputElement).value))} />
    </div>
    <button class="full" disabled={terrainHeightmapGeneratePending || !selectedTerrainSourceAssetUrl} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onGenerateTerrainHeightmap}>
      {terrainHeightmapGeneratePending ? 'Generating Heightmap...' : 'Generate Heightmap From Selection'}
    </button>
    <button class="full" disabled={terrainCollisionBakePending} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onBakeTerrainCollision}>
      {terrainCollisionBakePending ? 'Baking Collision...' : 'Bake Terrain Collision'}
    </button>
    <button class="full" disabled={terrainChunkCookPending || !(terrainCollisionSettings?.heightmapUrl || levelCollisionWorkflow.terrainManifestUrl)} data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onCookTerrainChunks}>
      {terrainChunkCookPending ? 'Cooking Chunks...' : 'Cook Visual Chunks'}
    </button>
    <div class="save-message">
      Source: {selectedTerrainSourceName || terrainCollisionSettings?.sourceName || 'select an asset mesh'}
    </div>
    <div class="save-message">
      {#if terrainCollisionSettings?.colliderUrl}
        collider {terrainCollisionSettings.colliderResolution ?? 0}, {terrainCollisionSettings.triangleCount ?? 0} triangles, {terrainCollisionSettings.heightOverrideCount ?? 0} height edits
      {:else}
        No baked terrain collision artifact is recorded for this scene.
      {/if}
    </div>
    {#if terrainCollisionSettings?.heightmapUrl || levelCollisionWorkflow.terrainManifestUrl}
      <div class="save-message">
        Heightmap: {terrainCollisionSettings?.heightmapUrl ?? 'manifest heightmap'} {terrainCollisionSettings?.heightmapResolution ? `(${terrainCollisionSettings.heightmapResolution})` : ''}; manifest: {terrainCollisionSettings?.manifestUrl ?? levelCollisionWorkflow.terrainManifestUrl}
      </div>
    {/if}
    {#if terrainCollisionSettings?.sourceTriangleCount}
      <div class="save-message">Source mesh triangles: {terrainCollisionSettings.sourceTriangleCount}</div>
    {/if}
    {#if terrainCollisionSettings?.chunksPath}
      <div class="save-message">Chunks: {terrainCollisionSettings.chunkCount ?? 0} files at {terrainCollisionSettings.chunksPath}</div>
    {/if}
    <div class="save-message">LMB drags terrain. Hold Shift while sculpting to lower with the raise brush.</div>
    {#if !terrainSculptingAvailable}
      <div class="save-message">Generate a heightmap first, then switch to Terrain mode to sculpt it.</div>
    {/if}
  </div>
{/if}

<div class="editor-section">
  <div class="label">Transform</div>
  <div class="button-row">
    <button class:active={transformMode === 'translate'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTransformMode('translate')}>Move</button>
    <button class:active={transformMode === 'rotate'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTransformMode('rotate')}>Rotate</button>
    <button class:active={transformMode === 'scale'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTransformMode('scale')}>Scale</button>
  </div>
  <div class="button-row compact">
    <button class:active={transformSpace === 'world'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTransformSpace('world')}>World</button>
    <button class:active={transformSpace === 'local'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTransformSpace('local')}>Local</button>
  </div>
  <div class="button-row compact">
    <button class:active={transformAxis === 'all'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTransformAxis('all')}>All</button>
    <button class:active={transformAxis === 'x'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTransformAxis('x')}>X</button>
    <button class:active={transformAxis === 'y'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTransformAxis('y')}>Y</button>
    <button class:active={transformAxis === 'z'} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSetTransformAxis('z')}>Z</button>
  </div>
  <label class="checkbox"><input type="checkbox" checked={snappingEnabled} data-sfx-click="soft" on:change={(event) => onSetSnappingEnabled((event.currentTarget as HTMLInputElement).checked)} /> Snapping</label>
  <div class="tuple-group">
    <div class="tuple-label">Move Snap</div>
    <input class="tuple-input" type="number" min="0.01" step="0.05" value={translateSnap} data-sfx-focus="focus-soft" on:change={(event) => onSetTranslateSnap(Number((event.currentTarget as HTMLInputElement).value))} />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Rotate Snap</div>
    <input class="tuple-input" type="number" min="0.1" step="1" value={rotateSnap} data-sfx-focus="focus-soft" on:change={(event) => onSetRotateSnap(Number((event.currentTarget as HTMLInputElement).value))} />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Scale Snap</div>
    <input class="tuple-input" type="number" min="0.01" step="0.05" value={scaleSnap} data-sfx-focus="focus-soft" on:change={(event) => onSetScaleSnap(Number((event.currentTarget as HTMLInputElement).value))} />
  </div>
  <label class="checkbox"><input type="checkbox" checked={surfaceSnapEnabled} data-sfx-click="soft" on:change={(event) => onSetSurfaceSnapEnabled((event.currentTarget as HTMLInputElement).checked)} /> Ground Snap</label>
  <div class="tuple-group">
    <div class="tuple-label">Ground Offset</div>
    <input class="tuple-input" type="number" step="0.05" value={surfaceSnapOffset} data-sfx-focus="focus-soft" on:change={(event) => onSetSurfaceSnapOffset(Number((event.currentTarget as HTMLInputElement).value))} />
  </div>
  <div class="save-message">Blender-style: G move, R rotate, S scale, X/Y/Z axis lock. Snap values now apply to gizmo drags and modal transforms. End ground snap.</div>
</div>
