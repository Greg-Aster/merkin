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
import type { EditorMaterialData, EditorSceneNode } from './editorTypes'

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

type GeneratedVariantItem = {
  name: string
  path: string
  url: string
}

export let propertiesShelfOpen = false

export let outlinerSubtitle = ''
export let outlinerMode: OutlinerDisplayMode = 'view-layer'
export let outlinerModeOptions: OutlinerModeOption[] = []
export let hierarchyFilter = ''
export let outlinerFilterPlaceholder = 'Search scene objects'
export let outlinerRows: OutlinerRow[] = []
export let outlinerDragEnabled = false
export let hierarchyDropTargetId: string | null = null
export let selectedNodeIds: string[] = []
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
export let getOutlinerRowActionState: (
  row: OutlinerRow,
) => OutlinerRowActionState = () => ({
  allVisible: false,
  allSelectable: false,
  allIsolated: false,
})

export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let parentCandidates: EditorSceneNode[] = []
export let selectedNodeMaterial: EditorMaterialData = {}
export let selectedNodePreviewAssetUrl = ''
export let selectedGeneratedVariantUrl = ''
export let styleDescriptor = ''
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
export let onConvertSelectedToMesh: () => void = () => {}
export let onReimagineSelected: () => void = () => {}
export let onDuplicate: () => void = () => {}
export let onDelete: () => void = () => {}
export let onVisibleChange: (value: boolean) => void = () => {}
export let onTransformChange: (
  field: 'position' | 'rotation' | 'scale',
  index: number,
  value: string,
) => void = () => {}
export let onParentChange: (value: string) => void = () => {}
export let onAssetUrlChange: (value: string) => void = () => {}
export let onOpenGeneratedAssetPicker: () => void = () => {}
export let onOpenImportedAssetPicker: () => void = () => {}
export let onPrefabVariantChange: (value: string) => void = () => {}
export let onPrimitiveGeometryChange: (value: string) => void = () => {}
export let onPrimitiveArgChange: (index: number, value: string) => void =
  () => {}
export let onLightColorChange: (value: string) => void = () => {}
export let onLightNumericChange: (field: any, value: string) => void = () => {}
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
export let onCollisionIntentChange: (value: CollisionIntent) => void = () => {}
export let onCollisionChannelChange: (value: CollisionChannel) => void =
  () => {}
export let onPhysicsBodyTypeChange: (value: string) => void = () => {}
export let onColliderSizeChange: (index: number, value: string) => void =
  () => {}
export let onTextureBrowserUp: () => void = () => {}
export let onTextureBrowserRefresh: () => void = () => {}
export let onTextureBrowserOpenDirectory: (path: string) => void = () => {}
export let onTextureBrowserPick: (item: TextureBrowserItem) => void = () => {}
</script>

<div class="editor-side-stack">
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
    getRowActionState={getOutlinerRowActionState}
  />

  {#if propertiesShelfOpen}
    <EditorPropertiesDock
      {selectedNode}
      {selectedNodes}
      {parentCandidates}
      {selectedNodeMaterial}
      {selectedNodePreviewAssetUrl}
      bind:selectedGeneratedVariantUrl
      {styleDescriptor}
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
      {onConvertSelectedToMesh}
      {onReimagineSelected}
      {onDuplicate}
      {onDelete}
      {onVisibleChange}
      {onTransformChange}
      {onParentChange}
      {onAssetUrlChange}
      {onOpenGeneratedAssetPicker}
      {onOpenImportedAssetPicker}
      {onPrefabVariantChange}
      {onPrimitiveGeometryChange}
      {onPrimitiveArgChange}
      {onLightColorChange}
      {onLightNumericChange}
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
      {onCollisionIntentChange}
      {onCollisionChannelChange}
      {onPhysicsBodyTypeChange}
      {onColliderSizeChange}
      {onTextureBrowserUp}
      {onTextureBrowserRefresh}
      {onTextureBrowserOpenDirectory}
      {onTextureBrowserPick}
    />
  {/if}
</div>

<style>
  .editor-side-stack {
    position: fixed;
    top: 4.15rem;
    right: 1rem;
    width: 23rem;
    height: min(25vh, 14rem);
    z-index: 78;
  }

  @media (max-width: 1280px) {
    .editor-side-stack {
      position: static;
      width: auto;
      height: auto;
    }
  }
</style>
