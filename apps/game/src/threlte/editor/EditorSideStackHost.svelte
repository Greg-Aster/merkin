<script lang="ts">
import type { CollisionChannel, CollisionIntent } from '../engine/types'
import EditorOutlinerDock from './EditorOutlinerDock.svelte'
import EditorPropertiesDock from './EditorPropertiesDock.svelte'
import type {
  OutlinerDisplayMode,
  OutlinerModeOption,
  OutlinerRow,
  OutlinerRowActionState,
} from './editorOutlinerTypes'
import type {
  EditorCollisionLodSourceTier,
  EditorCollisionMode,
  EditorCollisionQuality,
  EditorMaterialData,
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

export let propertiesShelfOpen = false
export let outlinerOpen = true
export let toolPanelOpen = true
export let sideStackSplitRatio = 0.38
export let onSideStackSplitRatioChange: (ratio: number) => void = () => {}

export let outlinerSubtitle = ''
export let outlinerMode: OutlinerDisplayMode = 'view-layer'
export let outlinerModeOptions: OutlinerModeOption[] = []
export let hierarchyFilter = ''
export let outlinerFilterPlaceholder = 'Search scene objects'
export let outlinerRows: OutlinerRow[] = []
export let outlinerDragEnabled = false
export let hierarchyDropTargetId: string | null = null
export let selectedNodeIds: string[] = []
export let hasGroupSelection = false
export let onOutlinerModeChange: (mode: OutlinerDisplayMode) => void = () => {}
export let onOutlinerFilterChange: (value: string) => void = () => {}
export let onOutlinerRowDisclosure: (
  row: OutlinerRow,
  event: MouseEvent,
) => void = () => {}
export let onOutlinerRowSelect: (row: OutlinerRow, event: MouseEvent) => void =
  () => {}
export let onOutlinerRowVisibility: (
  row: OutlinerRow,
  event: MouseEvent,
) => void = () => {}
export let onOutlinerRowSelectable: (
  row: OutlinerRow,
  event: MouseEvent,
) => void = () => {}
export let onOutlinerRowIsolation: (
  row: OutlinerRow,
  event: MouseEvent,
) => void = () => {}
export let onOutlinerRowDragStart: (
  row: OutlinerRow,
  event: DragEvent,
) => void = () => {}
export let onOutlinerRowDragEnd: () => void = () => {}
export let onOutlinerRowDragEnter: (
  row: OutlinerRow,
  event: DragEvent,
) => void = () => {}
export let onOutlinerRowDragOver: (row: OutlinerRow, event: DragEvent) => void =
  () => {}
export let onOutlinerRowDragLeave: (row: OutlinerRow) => void = () => {}
export let onOutlinerRowDrop: (row: OutlinerRow, event: DragEvent) => void =
  () => {}
export let onOutlinerGroupSelection: () => void = () => {}
export let onOutlinerUngroupSelection: () => void = () => {}
export let getOutlinerRowActionState: (
  row: OutlinerRow,
) => OutlinerRowActionState = () => ({
  allVisible: false,
  allSelectable: false,
  allIsolated: false,
})

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
export let generatedVariantItems: GeneratedVariantItem[] = []
export let generatedVariantLoading = false
export let generatedVariantError = ''
export let styleBusy = false
export let hunyuanBusy = false
export let hunyuanPrompt = ''
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
export let onLightNumericChange: (field: any, value: string) => void = () => {}
export let onPlaceLightAtParentBounds: () => void = () => {}
export let onGameplayFieldChange: (field: any, value: string) => void = () => {}
export let onGameplayNumericChange: (field: any, value: string) => void =
  () => {}
export let onGameplayBooleanChange: (field: any, value: boolean) => void =
  () => {}
export let onStyleDescriptorChange: (value: string) => void = () => {}
export let onApplyGeneratedVariant: (url: string) => void = () => {}
export let onOpenSelectedInBlender: () => void = () => {}
export let onExportBlenderPackage: () => void = () => {}
export let onReimportBlenderOutput: () => void = () => {}
export let onMaterialColorChange: (
  field: 'color' | 'emissive',
  value: string,
) => void = () => {}
export let onMaterialNumericChange: (
  field: 'metalness' | 'roughness' | 'opacity',
  value: string,
) => void = () => {}
export let onMaterialTextureChange: (field: 'mapUrl', value: string) => void =
  () => {}
export let onOpenTexturePicker: (field: TextureField) => void = () => {}
export let onResetMaterialOverrides: () => void = () => {}
export let onCollisionEnabledChange: (value: boolean) => void = () => {}
export let onCollisionModeChange: (value: EditorCollisionMode) => void =
  () => {}
export let onCollisionShapeChange: (value: any) => void = () => {}
export let onCollisionQualityChange: (value: EditorCollisionQuality) => void =
  () => {}
export let onCollisionLodSourceTierChange: (
  value: EditorCollisionLodSourceTier,
) => void = () => {}
export let onCollisionIntentChange: (value: CollisionIntent) => void = () => {}
export let onCollisionChannelChange: (value: CollisionChannel) => void =
  () => {}
export let onCollisionNumericChange: (field: any, value: string) => void =
  () => {}
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

let sideStackElement: HTMLDivElement | null = null
let splitResizeActive = false

function clampSplitRatio(ratio: number) {
  return Math.min(Math.max(ratio, 0.22), 0.68)
}

function beginSplitResize(event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  splitResizeActive = true
}

function resizeSplit(event: PointerEvent) {
  if (!splitResizeActive || !sideStackElement) return
  event.preventDefault()
  const rect = sideStackElement.getBoundingClientRect()
  if (rect.height <= 0) return
  onSideStackSplitRatioChange(
    clampSplitRatio((event.clientY - rect.top) / rect.height),
  )
}

function endSplitResize() {
  splitResizeActive = false
}
</script>

<svelte:window
  on:pointermove={resizeSplit}
  on:pointerup={endSplitResize}
  on:pointercancel={endSplitResize}
/>

<div
  bind:this={sideStackElement}
  class="editor-side-stack"
  class:expanded={!toolPanelOpen}
  class:split={outlinerOpen && propertiesShelfOpen}
  class:resizing-split={splitResizeActive}
  style={`--editor-side-stack-split: ${clampSplitRatio(sideStackSplitRatio) * 100}%;`}
>
  {#if outlinerOpen}
    <div class="side-stack-slot outliner-slot">
      <EditorOutlinerDock
        subtitle={outlinerSubtitle}
        mode={outlinerMode}
        modeOptions={outlinerModeOptions}
        filter={hierarchyFilter}
        filterPlaceholder={outlinerFilterPlaceholder}
        rows={outlinerRows}
        dragEnabled={outlinerDragEnabled}
        currentDropTargetId={hierarchyDropTargetId}
        {selectedNodeIds}
        onModeChange={onOutlinerModeChange}
        onFilterChange={onOutlinerFilterChange}
        onRowDisclosure={onOutlinerRowDisclosure}
        onRowSelect={onOutlinerRowSelect}
        onRowVisibility={onOutlinerRowVisibility}
        onRowSelectable={onOutlinerRowSelectable}
        onRowIsolation={onOutlinerRowIsolation}
        onRowDragStart={onOutlinerRowDragStart}
        onRowDragEnd={onOutlinerRowDragEnd}
        onRowDragEnter={onOutlinerRowDragEnter}
        onRowDragOver={onOutlinerRowDragOver}
        onRowDragLeave={onOutlinerRowDragLeave}
        onRowDrop={onOutlinerRowDrop}
        onGroupSelection={onOutlinerGroupSelection}
        onUngroupSelection={onOutlinerUngroupSelection}
        {hasGroupSelection}
        getRowActionState={getOutlinerRowActionState}
      />
    </div>
  {/if}

  {#if outlinerOpen && propertiesShelfOpen}
    <button
      class="side-stack-resize-handle"
      type="button"
      aria-label="Resize outliner and details split"
      on:pointerdown={beginSplitResize}
    ></button>
  {/if}

  {#if propertiesShelfOpen}
    <div class="side-stack-slot properties-slot">
      <EditorPropertiesDock
      {selectedNode}
      {selectedNodes}
      {sceneSettings}
      {sceneObjectCount}
      {sceneAssetNodeCount}
      {sceneColliderCount}
      {parentCandidates}
        {selectedNodeMaterial}
        {selectedNodePreviewAssetUrl}
        bind:selectedGeneratedVariantUrl
        {styleDescriptor}
        {viewportLightingMode}
        {viewportShadingMode}
        {assetPickerTargetNodeId}
        {assetBrowserPath}
        {assetBrowserItems}
        {assetBrowserFilter}
        {assetBrowserError}
        {assetBrowserLoading}
        {selectedLibraryItemPath}
        {generatedRootPath}
        {modelsRootPath}
        {canUseStyleStudioSelection}
        {canUseAiMeshStudioSelection}
        {generatedVariantItems}
        {generatedVariantLoading}
        {generatedVariantError}
        {styleBusy}
        {hunyuanBusy}
        bind:hunyuanPrompt
        {styleBlenderExportPath}
        {styleBlenderOpenCommand}
        {styleStatus}
        {activeTextureMaterialField}
        {textureBrowserPath}
        {textureBrowserLoading}
        {textureBrowserItems}
        {colliderSize}
      {onNameChange}
      {onOpenStyleTab}
      {onOpenAiTab}
      {onOpenCreateTab}
      {onConvertSelectedToMesh}
        {onReimagineSelected}
        {onAddPointLightToSelection}
        {onSetViewportLightingMode}
        {onSetViewportShadingMode}
        {onDuplicate}
        {onDelete}
        {onVisibleChange}
        {onSelectableChange}
        {onTransformChange}
        {onParentChange}
        {onAssetUrlChange}
        {onOpenGeneratedAssetPicker}
        {onOpenImportedAssetPicker}
        {onAssetLibraryRootSelect}
        {onAssetBrowserUp}
        {onAssetBrowserRefresh}
        {onAssetBrowserFilterChange}
        {onAssetLibraryItemSelect}
        {onApplySelectedLibraryAsset}
        {onCancelAssetPicker}
        {onPrefabVariantChange}
        {onPrimitiveGeometryChange}
        {onPrimitiveArgChange}
        {onLightColorChange}
        {onLightNumericChange}
        {onPlaceLightAtParentBounds}
        {onGameplayFieldChange}
        {onGameplayNumericChange}
        {onGameplayBooleanChange}
        {onStyleDescriptorChange}
        {onApplyGeneratedVariant}
        {onOpenSelectedInBlender}
        {onExportBlenderPackage}
        {onReimportBlenderOutput}
        {onMaterialColorChange}
        {onMaterialNumericChange}
        {onMaterialTextureChange}
        {onOpenTexturePicker}
        {onResetMaterialOverrides}
        {onCollisionEnabledChange}
        {onCollisionModeChange}
        {onCollisionShapeChange}
        {onCollisionQualityChange}
        {onCollisionLodSourceTierChange}
        {onCollisionIntentChange}
        {onCollisionChannelChange}
        {onCollisionNumericChange}
        {onPhysicsBodyTypeChange}
        {onSetCollisionVisualOnly}
        {onSetCollisionBlocker}
        {onSetCollisionWalkable}
        {onSetCollisionTrigger}
        {onSetCollisionDetail}
        {onForceRegenerateCollision}
        {onTextureBrowserUp}
        {onTextureBrowserRefresh}
        {onTextureBrowserOpenDirectory}
        {onTextureBrowserPick}
      />
    </div>
  {/if}
</div>

<style>
  .editor-side-stack {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    --editor-side-stack-split: 38%;
  }

  .editor-side-stack.expanded {
    height: 100%;
  }

  .side-stack-slot {
    display: flex;
    min-width: 0;
    min-height: 0;
  }

  .side-stack-slot > :global(*) {
    width: 100%;
    height: 100%;
  }

  .editor-side-stack.split .outliner-slot {
    flex: 0 0 var(--editor-side-stack-split);
    min-height: 10rem;
  }

  .editor-side-stack.split .properties-slot {
    flex: 1 1 auto;
  }

  .editor-side-stack:not(.split) .side-stack-slot {
    flex: 1 1 auto;
  }

  .side-stack-resize-handle {
    position: relative;
    z-index: 6;
    flex: 0 0 0.8rem;
    align-self: stretch;
    min-height: 0.8rem;
    margin-block: -0.15rem;
    margin-inline: 0.4rem;
    padding: 0;
    border: 0;
    border-radius: 0.45rem;
    background: rgba(126, 203, 255, 0.08);
    cursor: row-resize;
    opacity: 0.8;
    transition:
      background 0.12s ease,
      opacity 0.12s ease;
    touch-action: none;
  }

  .side-stack-resize-handle::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(4.5rem, 55%);
    height: 0.18rem;
    border-radius: 999px;
    background: rgba(126, 203, 255, 0.55);
    transform: translate(-50%, -50%);
  }

  .side-stack-resize-handle:hover,
  .side-stack-resize-handle:focus-visible,
  .editor-side-stack.resizing-split .side-stack-resize-handle {
    background: rgba(126, 203, 255, 0.2);
    opacity: 1;
  }

  .side-stack-resize-handle:hover::before,
  .side-stack-resize-handle:focus-visible::before,
  .editor-side-stack.resizing-split .side-stack-resize-handle::before {
    background: rgba(126, 203, 255, 0.9);
  }

  .editor-side-stack.resizing-split {
    cursor: row-resize;
    user-select: none;
  }

  @media (max-width: 900px) {
    .editor-side-stack {
      gap: 0.4rem;
    }

    .editor-side-stack.split .outliner-slot,
    .editor-side-stack.split .properties-slot {
      flex: 1 1 0;
      min-height: 0;
    }

    .side-stack-resize-handle {
      display: none;
    }
  }
</style>
