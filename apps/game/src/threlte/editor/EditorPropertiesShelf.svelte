<script lang="ts">
import type { CollisionChannel, CollisionIntent } from '../engine/types'
import EditorAssetPreview from './EditorAssetPreview.svelte'
import EditorNpcSection from './EditorNpcSection.svelte'
import {
  describeNodeCollisionSource,
  resolveNodeCollision,
} from './editorCollisionDefaults'
import type { EditorNpcPatch } from './editorNpcControls'
import type {
  EditorCollisionLodSourceTier,
  EditorCollisionMode,
  EditorCollisionQuality,
  EditorMaterialData,
  EditorNodeCollisionData,
  EditorSceneNode,
  EditorSceneSettings,
  EditorViewportLightingMode,
  EditorViewportShadingMode,
} from './editorTypes'

type TextureField =
  | 'mapUrl'
  | 'normalMapUrl'
  | 'roughnessMapUrl'
  | 'metalnessMapUrl'
  | 'emissiveMapUrl'
  | 'alphaMapUrl'

type TextureBrowserItem = {
  name: string
  path: string
  isDirectory: boolean
}

type AssetBrowserItem = {
  name: string
  path: string
  isDirectory: boolean
}

type GeneratedVariantItem = {
  name: string
  path: string
  url: string
  sourceLabel?: string
  isOriginalSource?: boolean
  mode?: string
  generatedAt?: string
  metadataUrl?: string
}
type CollisionShape = EditorNodeCollisionData['shape']
type CollisionNumericField = 'friction' | 'restitution' | 'maxTriangles'
type MaterialNumericField =
  | 'emissiveIntensity'
  | 'metalness'
  | 'roughness'
  | 'opacity'
  | 'envMapIntensity'
  | 'transmission'
  | 'ior'
  | 'clearcoat'
  | 'clearcoatRoughness'
  | 'thickness'
  | 'reflectivity'

type LightNumericField = 'intensity' | 'distance' | 'decay'
type GameplayTextField =
  | 'title'
  | 'author'
  | 'location'
  | 'excerpt'
  | 'body'
  | 'targetLevelId'
  | 'markerColor'
  | 'audioTrack'
  | 'fogColor'
  | 'mistColor'
type GameplayNumericField =
  | 'markerSize'
  | 'audioVolume'
  | 'regionFalloff'
  | 'fogDensity'
  | 'mistOpacity'
  | 'mistLayers'
  | 'mistSpacing'
  | 'mistScale'
  | 'mistDriftSpeed'
type GameplayBooleanField = never

export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let sceneSettings: EditorSceneSettings | null = null
export let sceneObjectCount = 0
export let sceneAssetNodeCount = 0
export let sceneColliderCount = 0
export let parentCandidates: EditorSceneNode[] = []
export let selectedNodeMaterial: EditorMaterialData = {}
export let selectedNodePreviewAssetUrl = ''
export let selectedGeneratedVariantUrl = ''
export let styleDescriptor = ''
export let viewportLightingMode: EditorViewportLightingMode = 'authored'
export let viewportShadingMode: EditorViewportShadingMode = 'rendered'
export let assetPickerTargetNodeId = ''
export let assetBrowserPath = ''
export let assetBrowserItems: AssetBrowserItem[] = []
export let assetBrowserFilter = ''
export let assetBrowserError = ''
export let assetBrowserLoading = false
export let selectedLibraryItemPath = ''
export let generatedRootPath = 'apps/megameal/public/generated/hunyuan3d'
export let modelsRootPath = 'apps/megameal/public/models'
export let canUseStyleStudioSelection = false
export let canUseAiMeshStudioSelection = false
export let hunyuanBusy = false
export let hunyuanPrompt = ''
export let generatedVariantItems: GeneratedVariantItem[] = []
export let generatedVariantLoading = false
export let generatedVariantError = ''
export let styleBusy = false
export let styleBlenderExportPath = ''
export let styleBlenderOpenCommand = ''
export let styleStatus = ''
export let activeTextureMaterialField: TextureField | null = null
export let textureBrowserPath = ''
export let textureBrowserLoading = false
export let textureBrowserItems: TextureBrowserItem[] = []
export let colliderSize: [number, number, number] = [1, 1, 1]

export let onNameChange: (value: string) => void = () => {}
export let onOpenStyleTab: () => void = () => {}
export let onOpenAiTab: () => void = () => {}
export let onOpenCreateTab: () => void = () => {}
export let onConvertSelectedToMesh: () => void = () => {}
export let onReimagineSelected: () => void = () => {}
export let onAddPointLightToSelection: () => void = () => {}
export let onSetViewportLightingMode: (
  mode: EditorViewportLightingMode,
) => void = () => {}
export let onSetViewportShadingMode: (mode: EditorViewportShadingMode) => void =
  () => {}
export let onDuplicate: () => void = () => {}
export let onDelete: () => void = () => {}
export let onVisibleChange: (value: boolean) => void = () => {}
export let onSelectableChange: (value: boolean) => void = () => {}
export let onTransformChange: (
  field: 'position' | 'rotation' | 'scale',
  index: number,
  value: string,
) => void = () => {}
export let onParentChange: (value: string) => void = () => {}
export let onAssetUrlChange: (value: string) => void = () => {}
export let onOpenGeneratedAssetPicker: () => void = () => {}
export let onOpenImportedAssetPicker: () => void = () => {}
export let onAssetLibraryRootSelect: (path: string) => void = () => {}
export let onAssetBrowserUp: () => void = () => {}
export let onAssetBrowserRefresh: () => void = () => {}
export let onAssetBrowserFilterChange: (value: string) => void = () => {}
export let onAssetLibraryItemSelect: (item: AssetBrowserItem) => void = () => {}
export let onApplySelectedLibraryAsset: () => void = () => {}
export let onCancelAssetPicker: () => void = () => {}
export let onPrefabVariantChange: (value: string) => void = () => {}
export let onPrimitiveGeometryChange: (value: string) => void = () => {}
export let onPrimitiveArgChange: (index: number, value: string) => void =
  () => {}
export let onLightColorChange: (value: string) => void = () => {}
export let onLightNumericChange: (
  field: LightNumericField,
  value: string,
) => void = () => {}
export let onPlaceLightAtParentBounds: () => void = () => {}
export let onGameplayFieldChange: (
  field: GameplayTextField,
  value: string,
) => void = () => {}
export let onGameplayNumericChange: (
  field: GameplayNumericField,
  value: string,
) => void = () => {}
export let onGameplayBooleanChange: (
  field: GameplayBooleanField,
  value: boolean,
) => void = () => {}
export let onNpcChange: (patch: EditorNpcPatch) => void = () => {}
export let onStyleDescriptorChange: (value: string) => void = () => {}
export let onSelectGeneratedVariant: (url: string) => void = () => {}
export let onApplyGeneratedVariant: (url: string) => void = () => {}
export let onResetGeneratedVariantPreview: () => void = () => {}
export let onOpenSelectedInBlender: () => void = () => {}
export let onExportBlenderPackage: () => void = () => {}
export let onReimportBlenderOutput: () => void = () => {}
export let onMaterialColorChange: (
  field: 'color' | 'emissive',
  value: string,
) => void = () => {}
export let onMaterialNumericChange: (
  field: MaterialNumericField,
  value: string,
) => void = () => {}
export let onMaterialTextureChange: (field: 'mapUrl', value: string) => void =
  () => {}
export let onOpenTexturePicker: (field: TextureField) => void = () => {}
export let onResetMaterialOverrides: () => void = () => {}

$: effectiveCollision = resolveNodeCollision(selectedNode, sceneSettings)
$: collisionSourceStatus = describeNodeCollisionSource(
  selectedNode,
  sceneSettings,
)
export let onCollisionEnabledChange: (value: boolean) => void = () => {}
export let onCollisionModeChange: (value: EditorCollisionMode) => void =
  () => {}
export let onCollisionShapeChange: (value: CollisionShape) => void = () => {}
export let onCollisionQualityChange: (value: EditorCollisionQuality) => void =
  () => {}
export let onCollisionLodSourceTierChange: (
  value: EditorCollisionLodSourceTier,
) => void = () => {}
export let onCollisionIntentChange: (value: CollisionIntent) => void = () => {}
export let onCollisionChannelChange: (value: CollisionChannel) => void =
  () => {}
export let onCollisionNumericChange: (
  field: CollisionNumericField,
  value: string,
) => void = () => {}
export let onPhysicsBodyTypeChange: (value: string) => void = () => {}
export let onSetCollisionVisualOnly: () => void = () => {}
export let onSetCollisionBlocker: () => void = () => {}
export let onSetCollisionWalkable: () => void = () => {}
export let onSetCollisionTrigger: () => void = () => {}
export let onSetCollisionDetail: () => void = () => {}
export let onForceRegenerateCollision: () => void = () => {}
export let onTextureBrowserUp: () => void = () => {}
export let onTextureBrowserRefresh: () => void = () => {}
export let onTextureBrowserOpenDirectory: (path: string) => void = () => {}
export let onTextureBrowserPick: (item: TextureBrowserItem) => void = () => {}

const transformFields: Array<'position' | 'rotation' | 'scale'> = [
  'position',
  'rotation',
  'scale',
]
const collisionIntentOptions: Array<{ value: CollisionIntent; label: string }> =
  [
    { value: 'walkable', label: 'Walkable' },
    { value: 'blocker', label: 'Blocker' },
    { value: 'trigger', label: 'Trigger' },
    { value: 'detailMesh', label: 'Detail' },
  ]
const collisionChannelOptions: Array<{
  value: CollisionChannel
  label: string
}> = [
  { value: 'worldStatic', label: 'World Static' },
  { value: 'worldDynamic', label: 'World Dynamic' },
  { value: 'player', label: 'Player' },
  { value: 'trigger', label: 'Trigger' },
  { value: 'detail', label: 'Detail' },
]
const collisionModeOptions: Array<{
  value: EditorCollisionMode
  label: string
}> = [
  { value: 'auto', label: 'Auto' },
  { value: 'trigger', label: 'Trigger' },
  { value: 'none', label: 'Disabled' },
]
const collisionQualityOptions: Array<{
  value: EditorCollisionQuality
  label: string
}> = [
  { value: 'primitive', label: 'Primitive' },
  { value: 'convexHull', label: 'Convex Hull' },
  { value: 'simplifiedMesh', label: 'Simplified Mesh' },
  { value: 'trimesh', label: 'Trimesh' },
]
const collisionLodSourceTierOptions: Array<{
  value: EditorCollisionLodSourceTier
  label: string
}> = [
  { value: 'source', label: 'Source' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

$: hasSingleSelection = !!selectedNode && selectedNodes.length <= 1
$: hasMultiSelection = selectedNodes.length > 1
$: selectedNodeType = selectedNode?.kind ?? 'scene'
$: hasGeometryNode = !!(
  selectedNode?.asset ||
  selectedNode?.prefab ||
  selectedNode?.primitive
)
$: lightPreviewMasked =
  viewportLightingMode !== 'authored' || viewportShadingMode !== 'rendered'
$: lightPreviewMaskReason =
  viewportShadingMode !== 'rendered'
    ? `View is ${viewportShadingMode}`
    : `Light is ${viewportLightingMode}`
$: canConvertSelectedToMesh = !!(
  selectedNode?.primitive || selectedNode?.prefab
)
$: canBakeSelectedMeshCollider = !!(
  selectedNode?.asset?.url || selectedNode?.prefab
)
$: selectedCollisionShape =
  selectedNode?.collision?.shape ??
  effectiveCollision?.shape ??
  (hasGeometryNode ? 'cuboid' : 'cuboid')
$: selectedCollisionMode =
  selectedNode?.collision?.mode ??
  (effectiveCollision?.intent === 'trigger'
    ? 'trigger'
    : effectiveCollision
      ? 'auto'
      : 'none')
$: selectedCollisionIntent = (
  selectedNode?.collision?.intent && selectedNode.collision.intent !== 'none'
    ? selectedNode.collision.intent
    : effectiveCollision?.intent && effectiveCollision.intent !== 'none'
      ? effectiveCollision.intent
      : 'blocker'
) as CollisionIntent
$: selectedCollisionQuality =
  selectedNode?.collision?.quality ??
  (selectedCollisionShape === 'trimesh' ? 'simplifiedMesh' : 'primitive')
$: selectedCollisionLodSourceTier = selectedNode?.collision?.lodTier ?? 'source'
$: selectedCollisionGenerationStatus =
  selectedNode?.collision?.mode === 'none' || !effectiveCollision
    ? 'disabled'
    : selectedNode?.collision?.generationStatus ?? 'ready'
$: selectedCollisionGenerationDetail =
  selectedNode?.collision?.generationLastError ??
  (selectedCollisionGenerationStatus === 'ready'
    ? 'Generated product is ready for publish.'
    : selectedCollisionGenerationStatus === 'disabled'
      ? 'Collision is explicitly off for this visual object.'
      : 'Collision product needs regeneration before publish.')
$: selectedSourceSummary = selectedNode?.asset?.url
  ? selectedNode.asset.url
  : selectedNode?.prefab
    ? selectedNode.prefab.variant
      ? `${selectedNode.prefab.type} / ${selectedNode.prefab.variant}`
      : selectedNode.prefab.type
    : selectedNode?.primitive
      ? `${selectedNode.primitive.geometry} (${selectedNode.primitive.args.join(', ')})`
      : 'scene-authored'
$: selectedGameplaySummary = selectedNode?.gameplay
  ? selectedNode.gameplay.title
    ? `${selectedNode.gameplay.type}: ${selectedNode.gameplay.title}`
    : selectedNode.gameplay.type
  : 'none'
$: selectedNpcSummary = selectedNode?.npc
  ? `${selectedNode.npc.archetype}: ${selectedNode.npc.displayName ?? selectedNode.npc.id}`
  : 'none'
$: filteredAssetBrowserItems = assetBrowserItems.filter(
  item =>
    !assetBrowserFilter.trim() ||
    item.name.toLowerCase().includes(assetBrowserFilter.trim().toLowerCase()),
)
$: isSelectedGeneratedAsset = Boolean(
  selectedNode?.asset?.url?.startsWith('/generated/'),
)
$: generatedVariantPreviewUrl =
  selectedGeneratedVariantUrl || selectedNode?.asset?.url || ''
$: selectedGeneratedVariantIndex = generatedVariantItems.findIndex(
  item => item.url === generatedVariantPreviewUrl,
)
$: normalizedGeneratedVariantIndex =
  selectedGeneratedVariantIndex >= 0 ? selectedGeneratedVariantIndex : 0
$: selectedGeneratedVariantItem =
  selectedGeneratedVariantIndex >= 0
    ? generatedVariantItems[selectedGeneratedVariantIndex] ?? null
    : null
$: originalGeneratedVariantItem =
  generatedVariantItems.find(item => item.isOriginalSource) ?? null
$: generatedVariantCount = generatedVariantItems.filter(
  item => !item.isOriginalSource,
).length
$: generatedReplacementMeshCount = generatedVariantItems.filter(
  item => item.mode === 'generate',
).length
$: generatedTextureWrapCount = generatedVariantItems.filter(
  item => item.mode === 'texture',
).length
$: generatedVariantCountSummary = [
  generatedReplacementMeshCount
    ? `${generatedReplacementMeshCount} replacement mesh${generatedReplacementMeshCount === 1 ? '' : 'es'}`
    : '',
  generatedTextureWrapCount
    ? `${generatedTextureWrapCount} texture wrap${generatedTextureWrapCount === 1 ? '' : 's'}`
    : '',
  originalGeneratedVariantItem ? 'original mesh' : '',
]
  .filter(Boolean)
  .join(' plus ')
$: generatedVariantLabel =
  selectedGeneratedVariantItem?.name?.replace(/\.(gltf|glb)$/i, '') ??
  selectedNode?.name ??
  'Variant'
$: generatedVariantSourceLabel = selectedGeneratedVariantItem?.sourceLabel ?? ''
$: generatedVariantApplyLabel =
  selectedGeneratedVariantItem?.mode === 'generate'
    ? 'Apply Replacement Mesh'
    : selectedGeneratedVariantItem?.mode === 'texture'
      ? 'Apply Texture Variant'
      : 'Apply Variant'
$: isPreviewingCurrentGeneratedAsset =
  Boolean(selectedNode?.asset?.url) &&
  generatedVariantPreviewUrl === selectedNode?.asset?.url
$: canApplyGeneratedVariant =
  Boolean(generatedVariantPreviewUrl) && !isPreviewingCurrentGeneratedAsset
$: canReturnToOriginalMesh = Boolean(
  originalGeneratedVariantItem &&
    selectedNode?.asset?.url &&
    selectedNode.asset.url !== originalGeneratedVariantItem.url,
)

function selectGeneratedVariantAt(index: number) {
  if (generatedVariantItems.length === 0) return
  const wrappedIndex =
    (index + generatedVariantItems.length) % generatedVariantItems.length
  const item = generatedVariantItems[wrappedIndex]
  if (item) {
    onSelectGeneratedVariant(item.url)
  }
}

function stepGeneratedVariant(offset: number) {
  if (selectedGeneratedVariantIndex < 0) {
    selectGeneratedVariantAt(offset > 0 ? 0 : generatedVariantItems.length - 1)
    return
  }
  selectGeneratedVariantAt(selectedGeneratedVariantIndex + offset)
}

function useAuthoredRenderedLightPreview() {
  onSetViewportShadingMode('rendered')
  onSetViewportLightingMode('authored')
}
</script>

{#if hasSingleSelection && selectedNode}
  <div class="editor-section compact-surface">
    <div class="label">Edit Selected Object</div>
    <div class="editor-status-card">
      <div class="editor-status-title">{selectedNode.name}</div>
      <div class="save-message">{selectedNodeType} · {selectedSourceSummary}</div>
      <div class="editor-chip-row">
        <span class="editor-chip ready">transform editable</span>
        <span class:ready={Boolean(effectiveCollision)} class:warn={!effectiveCollision} class="editor-chip">collision: {selectedCollisionMode}</span>
        <span class:ready={Boolean(selectedNode.npc)} class="editor-chip">npc: {selectedNode.npc ? 'configured' : 'none'}</span>
        <span class:ready={Boolean(selectedNode.gameplay)} class="editor-chip">gameplay: {selectedNode.gameplay ? 'configured' : 'none'}</span>
      </div>
      <div class="save-message">NPC: {selectedNpcSummary}</div>
      <div class="save-message">Gameplay: {selectedGameplaySummary}</div>
    </div>
    <div class="save-message">Next: adjust transform, visibility, material, collision, or gameplay details below.</div>
  </div>

  <div class="editor-section compact-surface">
    <div class="label">Details</div>
    <div class="save-message">Selected {selectedNodeType}</div>
    <input class="text-input" value={selectedNode.name} data-sfx-focus="focus-soft" on:input={(e) => onNameChange((e.currentTarget as HTMLInputElement).value)} />
    <div class="tuple-row editor-mt-sm">
      <label class="checkbox"><input type="checkbox" checked={selectedNode.visible} data-sfx-click="soft" on:change={(e) => onVisibleChange((e.currentTarget as HTMLInputElement).checked)} /> Visible</label>
      <label class="checkbox"><input type="checkbox" checked={!(selectedNode.locked ?? false)} data-sfx-click="soft" on:change={(e) => onSelectableChange((e.currentTarget as HTMLInputElement).checked)} /> Selectable</label>
    </div>
    <div class="button-row compact editor-mt-sm">
      <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onDuplicate}>Duplicate</button>
      <button class="danger" data-danger="true" data-sfx-hover="hover-emphasis" data-sfx-click="warning" on:click={onDelete}>Delete</button>
    </div>
  </div>

  {#if selectedNodePreviewAssetUrl}
    <EditorAssetPreview
      assetUrl={selectedNodePreviewAssetUrl}
      label="Selection Preview"
      hint={selectedSourceSummary}
      height={170}
    />
  {/if}

  {#if isSelectedGeneratedAsset}
    <div class="editor-section compact-surface generated-variant-browser">
      <div class="variant-browser-header">
        <div>
          <div class="label">Generated Variants</div>
          <div class="save-message">
            {generatedVariantCountSummary || `${generatedVariantCount} generated variant${generatedVariantCount === 1 ? '' : 's'}`}
          </div>
        </div>
        {#if generatedVariantItems.length > 0}
          <div class="variant-browser-count">
            {selectedGeneratedVariantIndex >= 0 ? normalizedGeneratedVariantIndex + 1 : 'current'} / {generatedVariantItems.length}
          </div>
        {/if}
      </div>

      {#if generatedVariantError}
        <div class="save-message error-message">{generatedVariantError}</div>
      {/if}

      <div class="button-row compact editor-mt-sm">
        <button
          type="button"
          data-sfx-hover="hover-emphasis"
          data-sfx-click="confirm"
          on:click={onReimagineSelected}
          disabled={!canUseAiMeshStudioSelection || hunyuanBusy}
        >
          {hunyuanBusy ? 'Making Variant...' : 'Make New Variant'}
        </button>
        {#if canReturnToOriginalMesh && originalGeneratedVariantItem}
          <button
            type="button"
            data-sfx-hover="hover-soft"
            data-sfx-click="panel-back"
            on:click={() => onApplyGeneratedVariant(originalGeneratedVariantItem.url)}
          >
            Return To Original Mesh
          </button>
        {/if}
      </div>

      {#if generatedVariantLoading}
        <div class="save-message">Loading variants...</div>
      {:else if generatedVariantItems.length === 0}
        <div class="save-message">No related GLB variants found.</div>
      {:else}
        <EditorAssetPreview
          assetUrl={generatedVariantPreviewUrl}
          label={isPreviewingCurrentGeneratedAsset ? 'Current Mesh' : 'Variant Preview'}
          hint={generatedVariantSourceLabel ? `${generatedVariantLabel} - ${generatedVariantSourceLabel}` : generatedVariantLabel}
          height={230}
        />

        <div class="variant-browser-controls">
          <button type="button" data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => stepGeneratedVariant(-1)}>Previous</button>
          <button
            type="button"
            data-sfx-hover="hover-emphasis"
            data-sfx-click="confirm"
            on:click={() => onApplyGeneratedVariant(generatedVariantPreviewUrl)}
            disabled={!canApplyGeneratedVariant}
          >
            {generatedVariantApplyLabel}
          </button>
          <button type="button" data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => stepGeneratedVariant(1)}>Next</button>
        </div>

        <div class="variant-strip" aria-label="Generated mesh variants">
          {#each generatedVariantItems as item, index (item.path)}
            <button
              type="button"
              class:active={generatedVariantPreviewUrl === item.url}
              class:current={item.url === selectedNode.asset?.url}
              data-sfx-hover="hover-soft"
              data-sfx-click="select"
              on:click={() => selectGeneratedVariantAt(index)}
            >
              <span>{item.name.replace(/\.(gltf|glb)$/i, '')}</span>
              <span class="kind">{item.url === selectedNode.asset?.url ? 'current' : item.sourceLabel ?? 'variant'}</span>
            </button>
          {/each}
        </div>

        {#if !isPreviewingCurrentGeneratedAsset}
          <button class="full" type="button" data-sfx-hover="hover-soft" data-sfx-click="panel-back" on:click={onResetGeneratedVariantPreview}>Return To Current Mesh</button>
        {/if}
      {/if}
    </div>
  {/if}

  <div class="editor-section compact-surface">
    <div class="label">Transform</div>
    {#each transformFields as field}
      <div class="tuple-group">
        <div class="tuple-label">{field}</div>
        <div class="tuple-row">
          {#each [0, 1, 2] as index}
            <input
              class="tuple-input"
              type="number"
              step={field === 'rotation' ? 0.01 : 0.1}
              value={selectedNode[field][index]}
              data-sfx-focus="focus-soft"
              on:change={(e) => onTransformChange(field, index, (e.currentTarget as HTMLInputElement).value)}
            />
          {/each}
        </div>
      </div>
    {/each}
    <div class="tuple-group">
      <div class="tuple-label">Parent</div>
      <select class="text-input" value={selectedNode.parentId ?? ''} data-sfx-focus="focus-soft" on:change={(e) => onParentChange((e.currentTarget as HTMLSelectElement).value)}>
        <option value="">Scene Root</option>
        {#each parentCandidates as candidate (candidate.id)}
          <option value={candidate.id}>{candidate.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="editor-section compact-surface">
    <div class="label">Mesh Source</div>
    {#if selectedNode.asset}
      <div class="editor-status-card">
        <div class="editor-status-title">{selectedNode.asset.url.split('/').pop()}</div>
        <div class="save-message path-label">{selectedNode.asset.url}</div>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenGeneratedAssetPicker}>Browse Generated</button>
        <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenImportedAssetPicker}>Browse Imported</button>
      </div>
      <div class="tuple-group">
        <details>
          <summary class="tuple-label">Manual Asset URL</summary>
          <input class="text-input editor-mt-sm" value={selectedNode.asset.url} data-sfx-focus="focus-soft" on:input={(e) => onAssetUrlChange((e.currentTarget as HTMLInputElement).value)} />
        </details>
      </div>
      {#if assetPickerTargetNodeId === selectedNode.id}
        <div class="editor-subsection editor-mt-sm">
          <div class="tuple-label">Asset Browser</div>
          <div class="button-row compact editor-mb-sm">
            <button class:active={assetBrowserPath.startsWith(generatedRootPath)} data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => onAssetLibraryRootSelect(generatedRootPath)}>Generated Assets</button>
            <button class:active={assetBrowserPath.startsWith(modelsRootPath)} data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={() => onAssetLibraryRootSelect(modelsRootPath)}>Imported Models</button>
            <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onAssetBrowserUp}>Up</button>
            <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onAssetBrowserRefresh}>Refresh</button>
          </div>
          <div class="save-message path-label">{assetBrowserPath}</div>
          <div class="tuple-group editor-mb-sm">
            <div class="tuple-label">Filter</div>
            <input class="text-input" value={assetBrowserFilter} placeholder="Filter asset names" data-sfx-focus="focus-soft" on:input={(e) => onAssetBrowserFilterChange((e.currentTarget as HTMLInputElement).value)} />
          </div>
          {#if assetBrowserError}
            <div class="save-message error-message">{assetBrowserError}</div>
          {/if}
          <div class="hierarchy-list asset-browser-list">
            {#if assetBrowserLoading}
              <div class="save-message">Loading assets…</div>
            {:else}
              {#each filteredAssetBrowserItems as item (item.path)}
                <button class:active={selectedLibraryItemPath === item.path} data-sfx-hover="hover-soft" data-sfx-click={item.isDirectory ? 'soft' : 'select'} on:click={() => onAssetLibraryItemSelect(item)}>
                  <span class="node-label">{item.isDirectory ? 'Folder' : 'Asset'} {item.name}</span>
                  <span class="kind">{item.isDirectory ? 'dir' : 'asset'}</span>
                </button>
              {/each}
            {/if}
          </div>
          <div class="button-row compact editor-mt-sm">
            <button data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onApplySelectedLibraryAsset} disabled={!selectedLibraryItemPath}>Apply Selected Asset</button>
            <button data-sfx-hover="hover-soft" data-sfx-click="panel-back" on:click={onCancelAssetPicker}>Cancel</button>
          </div>
        </div>
      {/if}
    {:else if selectedNode.prefab}
      <div class="tuple-group">
        <div class="tuple-label">Prefab Type</div>
        <input class="text-input" value={selectedNode.prefab.type} readonly />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Prefab Variant</div>
        <input class="text-input" value={selectedNode.prefab.variant ?? ''} data-sfx-focus="focus-soft" on:input={(e) => onPrefabVariantChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
    {:else if selectedNode.primitive}
      <div class="tuple-group">
        <div class="tuple-label">Primitive Geometry</div>
        <input class="text-input" value={selectedNode.primitive.geometry} data-sfx-focus="focus-soft" on:input={(e) => onPrimitiveGeometryChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Primitive Args</div>
        <div class="tuple-row dynamic-grid">
          {#each selectedNode.primitive.args as arg, index}
            <input class="tuple-input" type="number" step="0.05" value={arg} data-sfx-focus="focus-soft" on:change={(e) => onPrimitiveArgChange(index, (e.currentTarget as HTMLInputElement).value)} />
          {/each}
        </div>
      </div>
    {/if}

    {#if hasGeometryNode}
      <div class="tuple-group">
        <div class="tuple-label">Style Descriptor</div>
        <input class="text-input" value={styleDescriptor} data-sfx-focus="focus-soft" on:input={(e) => onStyleDescriptorChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="button-row compact editor-mt-sm">
        <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onConvertSelectedToMesh} disabled={!canConvertSelectedToMesh}>Replace Visual Source</button>
        <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenAiTab} disabled={!canUseAiMeshStudioSelection || hunyuanBusy}>Open AI Mesh Studio</button>
      </div>
    {/if}
  </div>

  {#if selectedNode.light}
    <div class="editor-section compact-surface">
      <div class="label">Light</div>
      <div class="save-message">Edit mode previews this light at full authored range. Runtime playtest may still apply performance light culling.</div>
      {#if lightPreviewMasked}
        <div class="save-message">
          Point light preview is currently masked ({lightPreviewMaskReason}). Use rendered/authored preview to see this light against authored materials.
        </div>
        <button
          class="full"
          data-sfx-hover="hover-emphasis"
          data-sfx-click="select"
          on:click={useAuthoredRenderedLightPreview}
        >
          Use Rendered Authored Preview
        </button>
      {/if}
      <div class="tuple-group">
        <div class="tuple-label">Light Color</div>
        <input class="text-input" type="color" value={selectedNode.light.color} on:input={(e) => onLightColorChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Light Intensity</div>
        <input class="tuple-input" type="number" min="0" step="0.1" value={selectedNode.light.intensity} on:input={(e) => onLightNumericChange('intensity', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Light Distance</div>
        <input class="tuple-input" type="number" min="0" step="0.1" value={selectedNode.light.distance} on:input={(e) => onLightNumericChange('distance', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Light Decay</div>
        <input class="tuple-input" type="number" min="0" step="0.1" value={selectedNode.light.decay} on:input={(e) => onLightNumericChange('decay', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="save-message">Distance is the point light radius. Move the light node if it is inside the mesh.</div>
      {#if selectedNode.parentId}
        <div class="button-row compact editor-mt-sm">
          <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onPlaceLightAtParentBounds}>Place Outside Parent</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if selectedNode.npc}
    <div class="editor-section compact-surface">
      <div class="label">NPC</div>
      <EditorNpcSection npc={selectedNode.npc} {onNpcChange} />
    </div>
  {/if}

  {#if selectedNode.gameplay}
    <div class="editor-section compact-surface">
      <div class="label">Gameplay</div>
      <div class="tuple-group">
        <div class="tuple-label">Gameplay Type</div>
        <input class="text-input" value={selectedNode.gameplay.type} readonly />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Marker Color</div>
        <input class="text-input" value={selectedNode.gameplay.markerColor ?? ''} on:input={(e) => onGameplayFieldChange('markerColor', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Marker Size</div>
        <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.markerSize ?? 0.7} on:change={(e) => onGameplayNumericChange('markerSize', (e.currentTarget as HTMLInputElement).value)} />
      </div>

      {#if selectedNode.gameplay.type === 'portal'}
        <div class="tuple-group">
          <div class="tuple-label">Target Level</div>
          <input class="text-input" value={selectedNode.gameplay.targetLevelId ?? ''} on:input={(e) => onGameplayFieldChange('targetLevelId', (e.currentTarget as HTMLInputElement).value)} />
        </div>
      {:else if selectedNode.gameplay.type === 'note'}
        <div class="tuple-group">
          <div class="tuple-label">Title</div>
          <input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Author</div>
          <input class="text-input" value={selectedNode.gameplay.author ?? ''} on:input={(e) => onGameplayFieldChange('author', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Location</div>
          <input class="text-input" value={selectedNode.gameplay.location ?? ''} on:input={(e) => onGameplayFieldChange('location', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Excerpt</div>
          <textarea rows="3" value={selectedNode.gameplay.excerpt ?? ''} on:input={(e) => onGameplayFieldChange('excerpt', (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Body</div>
          <textarea rows="5" value={selectedNode.gameplay.body ?? ''} on:input={(e) => onGameplayFieldChange('body', (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
        </div>
      {:else if selectedNode.gameplay.type === 'audio-region'}
        <div class="tuple-group">
          <div class="tuple-label">Region Label</div>
          <input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Ambient Track</div>
          <input class="text-input" value={selectedNode.gameplay.audioTrack ?? ''} on:input={(e) => onGameplayFieldChange('audioTrack', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field">
            <span class="editor-field-label">Volume</span>
            <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.audioVolume ?? 0.24} on:change={(e) => onGameplayNumericChange('audioVolume', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="editor-field">
            <span class="editor-field-label">Falloff</span>
            <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.regionFalloff ?? 12} on:change={(e) => onGameplayNumericChange('regionFalloff', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
      {:else if selectedNode.gameplay.type === 'fog-volume'}
        <div class="tuple-group">
          <div class="tuple-label">Volume Label</div>
          <input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Fog Color</div>
          <input class="text-input" type="color" value={selectedNode.gameplay.fogColor ?? '#9ba9bb'} on:input={(e) => onGameplayFieldChange('fogColor', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field">
            <span class="editor-field-label">Fog Density</span>
            <input class="tuple-input" type="number" step="0.0001" value={selectedNode.gameplay.fogDensity ?? 0.0025} on:change={(e) => onGameplayNumericChange('fogDensity', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="editor-field">
            <span class="editor-field-label">Edge Falloff</span>
            <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.regionFalloff ?? 8} on:change={(e) => onGameplayNumericChange('regionFalloff', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
      {:else if selectedNode.gameplay.type === 'mist-region'}
        <div class="tuple-group">
          <div class="tuple-label">Mist Label</div>
          <input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Mist Color</div>
          <input class="text-input" type="color" value={selectedNode.gameplay.mistColor ?? '#241557'} on:input={(e) => onGameplayFieldChange('mistColor', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field">
            <span class="editor-field-label">Mist Opacity</span>
            <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.mistOpacity ?? 0.14} on:change={(e) => onGameplayNumericChange('mistOpacity', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="editor-field">
            <span class="editor-field-label">Mist Layers</span>
            <input class="tuple-input" type="number" step="1" value={selectedNode.gameplay.mistLayers ?? 3} on:change={(e) => onGameplayNumericChange('mistLayers', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="editor-field-grid editor-mt-sm">
          <label class="editor-field">
            <span class="editor-field-label">Layer Spacing</span>
            <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.mistSpacing ?? 0.45} on:change={(e) => onGameplayNumericChange('mistSpacing', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="editor-field">
            <span class="editor-field-label">Mist Scale</span>
            <input class="tuple-input" type="number" step="10" value={selectedNode.gameplay.mistScale ?? 360} on:change={(e) => onGameplayNumericChange('mistScale', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="tuple-group editor-mt-sm">
          <div class="tuple-label">Mist Drift</div>
          <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.mistDriftSpeed ?? 0.05} on:change={(e) => onGameplayNumericChange('mistDriftSpeed', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="save-message editor-mt-sm">Move the node to reposition the mist. Toggle `Visible` to hide it, or delete the node to remove it entirely.</div>
      {/if}
    </div>
  {/if}

  {#if hasGeometryNode}
    <div class="editor-section compact-surface">
      <div class="label">Light Emitter</div>
      <div class="save-message">Material emission changes visible glow only. Add a child point light for actual scene lighting.</div>
      <div class="button-row compact editor-mt-sm">
        <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onAddPointLightToSelection}>Add Child Point Light</button>
      </div>
    </div>

    <div class="editor-section compact-surface">
      <div class="label">Material</div>
      <div class="editor-field-grid">
        <label class="editor-field">
          <span class="editor-field-label">Base Color</span>
          <input class="text-input" type="color" value={selectedNodeMaterial.color ?? '#ffffff'} on:input={(e) => onMaterialColorChange('color', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="editor-field">
          <span class="editor-field-label">Emissive Color</span>
          <input class="text-input" type="color" value={selectedNodeMaterial.emissive ?? '#000000'} on:input={(e) => onMaterialColorChange('emissive', (e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
      <div class="editor-field-grid editor-mt-sm">
        <label class="editor-field">
          <span class="editor-field-label">Emit Intensity</span>
          <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.emissiveIntensity ?? 0} on:change={(e) => onMaterialNumericChange('emissiveIntensity', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="editor-field">
          <span class="editor-field-label">Env Reflections</span>
          <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.envMapIntensity ?? 1} on:change={(e) => onMaterialNumericChange('envMapIntensity', (e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
      <div class="editor-field-grid editor-field-grid--triple editor-mt-sm">
        <label class="editor-field">
          <span class="editor-field-label">Metalness</span>
          <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.metalness ?? 0.5} on:change={(e) => onMaterialNumericChange('metalness', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="editor-field">
          <span class="editor-field-label">Roughness</span>
          <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.roughness ?? 0.5} on:change={(e) => onMaterialNumericChange('roughness', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="editor-field">
          <span class="editor-field-label">Opacity</span>
          <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.opacity ?? 1} on:change={(e) => onMaterialNumericChange('opacity', (e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
      <div class="editor-field-grid editor-field-grid--triple editor-mt-sm">
        <label class="editor-field">
          <span class="editor-field-label">Transmission</span>
          <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.transmission ?? 0} on:change={(e) => onMaterialNumericChange('transmission', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="editor-field">
          <span class="editor-field-label">IOR</span>
          <input class="tuple-input" type="number" min="1" max="2.5" step="0.05" value={selectedNodeMaterial.ior ?? 1.5} on:change={(e) => onMaterialNumericChange('ior', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="editor-field">
          <span class="editor-field-label">Reflectivity</span>
          <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.reflectivity ?? 0.5} on:change={(e) => onMaterialNumericChange('reflectivity', (e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
      <div class="editor-field-grid editor-field-grid--triple editor-mt-sm">
        <label class="editor-field">
          <span class="editor-field-label">Clearcoat</span>
          <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.clearcoat ?? 0} on:change={(e) => onMaterialNumericChange('clearcoat', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="editor-field">
          <span class="editor-field-label">Coat Roughness</span>
          <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.clearcoatRoughness ?? 0} on:change={(e) => onMaterialNumericChange('clearcoatRoughness', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="editor-field">
          <span class="editor-field-label">Thickness</span>
          <input class="tuple-input" type="number" min="0" step="0.05" value={selectedNodeMaterial.thickness ?? 0} on:change={(e) => onMaterialNumericChange('thickness', (e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Base Color Map</div>
        <div class="button-row level-switch-row">
          <input class="text-input" placeholder="/textures/stone/albedo.jpg" value={selectedNodeMaterial.mapUrl ?? ''} on:input={(e) => onMaterialTextureChange('mapUrl', (e.currentTarget as HTMLInputElement).value)} />
          <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={() => onOpenTexturePicker('mapUrl')}>Pick</button>
        </div>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button data-sfx-hover="hover-soft" data-sfx-click="warning" on:click={onResetMaterialOverrides}>Reset Material Overrides</button>
      </div>
    </div>
  {/if}

  {#if hasGeometryNode}
    <div class="editor-section compact-surface">
      <div class="label">Collision</div>
      <div class="save-message" class:error-message={collisionSourceStatus.tone === 'warning'}>
        Collision Source: {collisionSourceStatus.label}. {collisionSourceStatus.detail}
      </div>
      <select class="text-input" value={selectedCollisionMode} data-sfx-focus="focus-soft" on:change={(e) => onCollisionModeChange((e.currentTarget as HTMLSelectElement).value as EditorCollisionMode)}>
        {#each collisionModeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <div class="button-row compact editor-mt-sm">
        <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onSetCollisionVisualOnly}>Visual Only</button>
      </div>
      <select class="text-input" value={selectedCollisionIntent} disabled={selectedCollisionMode === 'none'} data-sfx-focus="focus-soft" on:change={(e) => onCollisionIntentChange((e.currentTarget as HTMLSelectElement).value as CollisionIntent)}>
        {#each collisionIntentOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <select class="text-input" value={selectedCollisionQuality} disabled={selectedCollisionMode === 'none'} data-sfx-focus="focus-soft" on:change={(e) => onCollisionQualityChange((e.currentTarget as HTMLSelectElement).value as EditorCollisionQuality)}>
        {#each collisionQualityOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <select class="text-input" value={selectedCollisionLodSourceTier} disabled={selectedCollisionMode === 'none'} data-sfx-focus="focus-soft" on:change={(e) => onCollisionLodSourceTierChange((e.currentTarget as HTMLSelectElement).value as EditorCollisionLodSourceTier)}>
        {#each collisionLodSourceTierOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <select class="text-input" value={selectedNode.collision?.channel ?? effectiveCollision?.channel ?? 'worldStatic'} disabled={selectedCollisionMode === 'none'} data-sfx-focus="focus-soft" on:change={(e) => onCollisionChannelChange((e.currentTarget as HTMLSelectElement).value as CollisionChannel)}>
        {#each collisionChannelOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <select class="text-input" value={selectedNode.physics?.bodyType ?? 'fixed'} data-sfx-focus="focus-soft" on:change={(e) => onPhysicsBodyTypeChange((e.currentTarget as HTMLSelectElement).value)}>
        <option value="fixed">Fixed</option>
        <option value="dynamic">Dynamic</option>
        <option value="kinematicPosition">Kinematic</option>
      </select>
      {#if effectiveCollision}
        <div class="tuple-row editor-mt-sm">
          <input class="tuple-input" type="number" min="0" step="0.05" value={effectiveCollision.friction ?? 0.7} data-sfx-focus="focus-soft" on:change={(e) => onCollisionNumericChange('friction', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" min="0" step="0.05" value={effectiveCollision.restitution ?? 0} data-sfx-focus="focus-soft" on:change={(e) => onCollisionNumericChange('restitution', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-row">
          <input class="tuple-input" type="number" min="0" step="1" value={selectedNode.collision?.maxTriangles ?? effectiveCollision.triangleBudget ?? 0} data-sfx-focus="focus-soft" on:change={(e) => onCollisionNumericChange('maxTriangles', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="save-message" class:error-message={selectedCollisionGenerationStatus === 'failed'}>
          Status: {selectedCollisionGenerationStatus}. {selectedCollisionGenerationDetail}
        </div>
        {#if effectiveCollision.triangleCount}
          <div class="save-message">Generated triangles: {effectiveCollision.triangleCount.toLocaleString()}</div>
        {/if}
        {#if canBakeSelectedMeshCollider}
          <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onForceRegenerateCollision} disabled={selectedCollisionMode === 'none' || selectedCollisionQuality === 'primitive'}>Force Regenerate</button>
        {/if}
      {:else}
        <div class="save-message">Status: disabled. Collision is explicitly off for this visual object.</div>
      {/if}
    </div>
  {/if}

  {#if activeTextureMaterialField}
    <div class="editor-section compact-surface">
      <div class="label">Texture Browser</div>
      <div class="button-row compact">
        <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onTextureBrowserUp}>Up</button>
        <button data-sfx-hover="hover-soft" data-sfx-click="soft" on:click={onTextureBrowserRefresh}>Refresh</button>
      </div>
      <div class="save-message path-label">{textureBrowserPath}</div>
      <div class="save-message">Picking for `{activeTextureMaterialField}`.</div>
      <div class="hierarchy-list asset-browser-list">
        {#if textureBrowserLoading}
          <div class="save-message">Loading textures…</div>
        {:else}
          {#each textureBrowserItems as item (item.path)}
            <button data-sfx-hover="hover-soft" data-sfx-click={item.isDirectory ? 'soft' : 'select'} on:click={() => item.isDirectory ? onTextureBrowserOpenDirectory(item.path) : onTextureBrowserPick(item)}>
              <span class="node-label">{item.isDirectory ? '📁' : '🖼️'} {item.name}</span>
              <span class="kind">{item.isDirectory ? 'dir' : 'texture'}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
{:else if hasMultiSelection}
  <div class="editor-section compact-surface">
    <div class="label">Multi-Selection</div>
    <div class="save-message">{selectedNodes.length} objects selected. Shared transform, duplicate, delete, group, and visibility actions are available.</div>
    <div class="button-row compact editor-mt-sm">
      <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onDuplicate}>Duplicate</button>
      <button class="danger" data-danger="true" data-sfx-hover="hover-emphasis" data-sfx-click="warning" on:click={onDelete}>Delete</button>
    </div>
  </div>
{:else}
  <div class="editor-section compact-surface">
    <div class="label">Scene Summary</div>
    <div class="save-message">{sceneObjectCount} object{sceneObjectCount === 1 ? '' : 's'} · {sceneAssetNodeCount} asset node{sceneAssetNodeCount === 1 ? '' : 's'} · {sceneColliderCount} collider{sceneColliderCount === 1 ? '' : 's'}</div>
    <div class="save-message editor-mt-sm">Select an object in the viewport or outliner to inspect it here.</div>
    <div class="button-row compact editor-mt-sm">
      <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenCreateTab}>Create Object</button>
    </div>
  </div>
{/if}

<style>
  .variant-browser-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .variant-browser-count {
    flex: 0 0 auto;
    padding: 0.18rem 0.42rem;
    border: 1px solid rgba(126, 203, 255, 0.18);
    border-radius: 999px;
    background: rgba(20, 34, 48, 0.82);
    color: #cfeaff;
    font-size: 0.68rem;
  }

  .variant-browser-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr);
    gap: 0.32rem;
    margin-top: 0.42rem;
  }

  .variant-strip {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(8.5rem, 11rem);
    gap: 0.38rem;
    margin-top: 0.46rem;
    overflow-x: auto;
    padding-bottom: 0.35rem;
    scrollbar-width: thin;
  }

  .variant-strip button {
    display: grid;
    gap: 0.22rem;
    min-height: 3.4rem;
    text-align: left;
  }

  .variant-strip button.active {
    border-color: rgba(128, 221, 163, 0.44);
    background: rgba(15, 46, 28, 0.78);
  }

  .variant-strip button.current:not(.active) {
    border-color: rgba(255, 210, 120, 0.28);
  }

  @media (max-width: 760px) {
    .variant-browser-controls {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .variant-browser-controls button:nth-child(2) {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
</style>
