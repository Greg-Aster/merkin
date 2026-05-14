<script lang="ts">
import type { CollisionChannel, CollisionIntent } from '../engine/types'
import type {
  EditorMaterialData,
  EditorSceneNode,
  EditorSceneSettings,
} from './editorTypes'

type BrowserItem = {
  name: string
  path: string
  isDirectory: boolean
}

type AmbientAudioTrack = {
  label: string
  src: string
}

export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let sceneSettings: EditorSceneSettings | null = null
export let parentCandidates: EditorSceneNode[] = []
export let multiParentCandidates: EditorSceneNode[] = []
export let selectedNodeMaterial: EditorMaterialData = {}
export let selectedNodeColliderSize: [number, number, number] = [1, 1, 1]
export let styleDescriptor = ''
export let assetPickerTargetNodeId = ''
export let assetBrowserPath = ''
export let assetBrowserItems: BrowserItem[] = []
export let assetBrowserFilter = ''
export let assetBrowserError = ''
export let assetBrowserLoading = false
export let selectedLibraryItemPath = ''
export let activeTextureMaterialField: any = null
export let textureBrowserPath = ''
export let textureBrowserItems: BrowserItem[] = []
export let textureBrowserError = ''
export let textureBrowserLoading = false
export let ambientAudioLibrary: AmbientAudioTrack[] = []
export let canUseAiMeshStudioSelection = false
export let hunyuanBusy = false
export let hunyuanPrompt = ''

export let onNameChange: (value: string) => void = () => {}
export let onVisibleChange: (value: boolean) => void = () => {}
export let onParentChange: (value: string) => void = () => {}
export let onPrefabVariantChange: (value: string) => void = () => {}
export let onAssetUrlChange: (value: string) => void = () => {}
export let onOpenGeneratedAssetPicker: () => void = () => {}
export let onOpenImportedAssetPicker: () => void = () => {}
export let onAssetLibraryRootSelect: (path: string) => void = () => {}
export let onAssetBrowserUp: () => void = () => {}
export let onAssetBrowserRefresh: () => void = () => {}
export let onAssetBrowserFilterChange: (value: string) => void = () => {}
export let onAssetLibraryItemSelect: (item: BrowserItem) => void = () => {}
export let onApplySelectedLibraryAsset: () => void = () => {}
export let onCancelAssetPicker: () => void = () => {}
export let onStyleDescriptorChange: (value: string) => void = () => {}
export let onConvertSelectedToMesh: () => void = () => {}
export let onReimagineSelected: () => void = () => {}
export let onPrimitiveGeometryChange: (value: string) => void = () => {}
export let onPrimitiveArgChange: (index: number, value: string) => void =
  () => {}
export let onCollisionEnabledChange: (value: boolean) => void = () => {}
export let onCollisionShapeChange: (value: any) => void = () => {}
export let onCollisionIntentChange: (value: CollisionIntent) => void = () => {}
export let onCollisionChannelChange: (value: CollisionChannel) => void =
  () => {}
export let onPhysicsBodyTypeChange: (value: string) => void = () => {}
export let onPhysicsNumericChange: (field: any, value: string) => void =
  () => {}
export let onPhysicsBooleanChange: (field: any, value: boolean) => void =
  () => {}
export let onCollisionSizeChange: (index: number, value: string) => void =
  () => {}
export let onCollisionNumericChange: (field: any, value: string) => void =
  () => {}
export let onCollisionBooleanChange: (field: any, value: boolean) => void =
  () => {}
export let onRecalculateCollision: () => void = () => {}
export let onSetCollisionVisualOnly: () => void = () => {}
export let onSetCollisionBlocker: () => void = () => {}
export let onSetCollisionWalkable: () => void = () => {}
export let onSetCollisionTrigger: () => void = () => {}
export let onSetCollisionDetail: () => void = () => {}
export let onBakeMeshCollider: () => void = () => {}
export let onMaterialColorChange: (field: any, value: string) => void = () => {}
export let onMaterialNumericChange: (field: any, value: string) => void =
  () => {}
export let onMaterialBooleanChange: (field: any, value: boolean) => void =
  () => {}
export let onMaterialTextureChange: (field: any, value: string) => void =
  () => {}
export let onOpenTexturePicker: (field: any) => void = () => {}
export let onTextureBrowserUp: () => void = () => {}
export let onTextureBrowserRefresh: () => void = () => {}
export let onTextureBrowserOpenDirectory: (path: string) => void = () => {}
export let onTextureBrowserPick: (item: BrowserItem) => void = () => {}
export let onResetMaterialOverrides: () => void = () => {}
export let onLightFieldChange: (field: 'color', value: string) => void =
  () => {}
export let onLightNumericChange: (field: any, value: string) => void = () => {}
export let onGameplayFieldChange: (field: any, value: string) => void = () => {}
export let onGameplayBooleanChange: (field: any, value: boolean) => void =
  () => {}
export let onGameplayNumericChange: (field: any, value: string) => void =
  () => {}
export let onTransformChange: (
  field: 'position' | 'rotation' | 'scale',
  index: number,
  value: string,
) => void = () => {}
export let onDuplicate: () => void = () => {}
export let onDelete: () => void = () => {}
export let onOpenDetailsPanel: () => void = () => {}
</script>

<div class="editor-section">
  <div class="label">Inspect</div>
  {#if selectedNodes.length > 1}
    <div class="save-message">{selectedNodes.length} objects selected. Use the Details shelf for shared selection context and the outliner for batch visibility or selectability.</div>
  {:else if selectedNode}
    <div class="save-message">Details for {selectedNode.name} are edited in the right-side Details shelf.</div>
  {:else}
    <div class="save-message">Select an object in the viewport or outliner, then use the right-side Details shelf for properties.</div>
  {/if}
  <div class="button-row compact editor-mt-sm">
    <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenDetailsPanel}>Open Details Shelf</button>
  </div>
</div>
