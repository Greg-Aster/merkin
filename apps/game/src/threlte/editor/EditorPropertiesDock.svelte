<script lang="ts">
import type { CollisionChannel, CollisionIntent } from '../engine/types'
import EditorPropertiesShelf from './EditorPropertiesShelf.svelte'
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

<div class="editor-side-panel editor-properties-panel">
  <div class="editor-side-content">
    <EditorPropertiesShelf
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
      onSelectGeneratedVariant={(url) => { selectedGeneratedVariantUrl = url }}
      {onApplyGeneratedVariant}
      onResetGeneratedVariantPreview={() => { selectedGeneratedVariantUrl = selectedNode?.asset?.url ?? '' }}
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
  </div>
</div>

<style>
  .editor-side-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: rgba(9, 14, 24, 0.92);
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.75rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.35);
  }

  .editor-side-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.62rem 0.72rem 0.72rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(126, 203, 255, 0.4) rgba(5, 9, 16, 0.35);
  }

  .editor-side-content::-webkit-scrollbar {
    width: 0.5rem;
  }

  .editor-side-content::-webkit-scrollbar-thumb {
    background: rgba(126, 203, 255, 0.32);
    border-radius: 999px;
  }

  .editor-side-content::-webkit-scrollbar-track {
    background: rgba(5, 9, 16, 0.24);
  }

  .editor-properties-panel :global(.editor-preview-card) {
    margin-top: 0.28rem;
  }

  .editor-properties-panel :global(.editor-preview-card .tuple-label) {
    font-size: 0.64rem;
  }

  .editor-properties-panel :global(.editor-preview-surface) {
    max-height: 12rem;
  }

  .editor-properties-panel :global(.editor-section) {
    padding: 0.56rem 0.62rem;
  }

  .editor-properties-panel {
    position: fixed;
    top: 4.15rem;
    right: 24.75rem;
    width: 19rem;
    height: calc(100vh - 5rem);
    max-height: calc(100vh - 5rem);
    z-index: 79;
  }

  @media (max-width: 1280px) {
    .editor-properties-panel {
      position: static;
      width: auto;
      height: auto;
      max-height: none;
    }
  }
</style>
