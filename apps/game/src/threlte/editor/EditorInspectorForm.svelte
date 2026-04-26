<script lang="ts">
import EditorAssetPreview from './EditorAssetPreview.svelte'
import { resolveNodeCollision } from './editorCollisionDefaults'
import type { EditorMaterialData, EditorSceneNode } from './editorTypes'

type TextureField =
  | 'mapUrl'
  | 'normalMapUrl'
  | 'roughnessMapUrl'
  | 'metalnessMapUrl'
  | 'emissiveMapUrl'
  | 'alphaMapUrl'

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

type MaterialBooleanField =
  | 'transparent'
  | 'wireframe'
  | 'doubleSided'
  | 'flatShading'
type PhysicsNumericField = 'gravityScale' | 'linearDamping' | 'angularDamping'
type PhysicsBooleanField =
  | 'canSleep'
  | 'ccd'
  | 'lockRotations'
  | 'lockTranslations'
type CollisionNumericField = 'friction' | 'restitution'
type CollisionBooleanField = 'sensor'
type LightNumericField = 'intensity' | 'distance' | 'decay'
type GameplayField =
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
  | 'wanderRadius'
  | 'wanderSpeed'
  | 'hoverHeight'
  | 'bobAmplitude'
  | 'bobSpeed'
  | 'twinkleSpeed'
  | 'lightIntensity'
  | 'lightDistance'
  | 'lightDecay'
  | 'spriteIntensity'
  | 'lightBurstBoost'

type AssetBrowserItem = {
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
export let parentCandidates: EditorSceneNode[] = []
export let multiParentCandidates: EditorSceneNode[] = []
export let selectedNodeMaterial: EditorMaterialData = {}
export let selectedNodeColliderSize: [number, number, number] = [1, 1, 1]
export let styleDescriptor = ''
export let canUseAiMeshStudioSelection = false
export let hunyuanBusy = false
export let hunyuanPrompt = ''

export let assetPickerTargetNodeId = ''
export let assetBrowserPath = ''
export let assetBrowserItems: AssetBrowserItem[] = []
export let assetBrowserFilter = ''
export let assetBrowserError = ''
export let assetBrowserLoading = false
export let selectedLibraryItemPath = ''

export let activeTextureMaterialField: TextureField | null = null
export let textureBrowserPath = ''
export let textureBrowserItems: AssetBrowserItem[] = []
export let textureBrowserError = ''
export let textureBrowserLoading = false

export let ambientAudioLibrary: AmbientAudioTrack[] = []

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
export let onAssetLibraryItemSelect: (item: AssetBrowserItem) => void = () => {}
export let onApplySelectedLibraryAsset: () => void = () => {}
export let onCancelAssetPicker: () => void = () => {}
export let onStyleDescriptorChange: (value: string) => void = () => {}
export let onPrimitiveGeometryChange: (value: string) => void = () => {}
export let onPrimitiveArgChange: (index: number, value: string) => void =
  () => {}
export let onCollisionEnabledChange: (value: boolean) => void = () => {}
export let onPhysicsBodyTypeChange: (value: string) => void = () => {}
export let onPhysicsNumericChange: (
  field: PhysicsNumericField,
  value: string,
) => void = () => {}
export let onPhysicsBooleanChange: (
  field: PhysicsBooleanField,
  value: boolean,
) => void = () => {}
export let onCollisionSizeChange: (index: number, value: string) => void =
  () => {}
export let onCollisionNumericChange: (
  field: CollisionNumericField,
  value: string,
) => void = () => {}
export let onCollisionBooleanChange: (
  field: CollisionBooleanField,
  value: boolean,
) => void = () => {}
export let onRecalculateCollision: () => void = () => {}

$: effectiveCollision = resolveNodeCollision(selectedNode)
export let onMaterialColorChange: (
  field: 'color' | 'emissive',
  value: string,
) => void = () => {}
export let onMaterialNumericChange: (
  field: MaterialNumericField,
  value: string,
) => void = () => {}
export let onMaterialBooleanChange: (
  field: MaterialBooleanField,
  value: boolean,
) => void = () => {}
export let onMaterialTextureChange: (
  field: TextureField,
  value: string,
) => void = () => {}
export let onOpenTexturePicker: (field: TextureField) => void = () => {}
export let onTextureBrowserUp: () => void = () => {}
export let onTextureBrowserRefresh: () => void = () => {}
export let onTextureBrowserOpenDirectory: (path: string) => void = () => {}
export let onTextureBrowserPick: (item: AssetBrowserItem) => void = () => {}
export let onResetMaterialOverrides: () => void = () => {}
export let onLightFieldChange: (field: 'color', value: string) => void =
  () => {}
export let onLightNumericChange: (
  field: LightNumericField,
  value: string,
) => void = () => {}
export let onGameplayFieldChange: (
  field: GameplayField,
  value: string,
) => void = () => {}
export let onGameplayBooleanChange: (
  field: 'wanderEnabled',
  value: boolean,
) => void = () => {}
export let onGameplayNumericChange: (
  field: GameplayNumericField,
  value: string,
) => void = () => {}
export let onTransformChange: (
  field: 'position' | 'rotation' | 'scale',
  index: number,
  value: string,
) => void = () => {}
export let onDuplicate: () => void = () => {}
export let onDelete: () => void = () => {}
export let onConvertSelectedToMesh: () => void = () => {}
export let onReimagineSelected: () => void = () => {}

const generatedRoot = 'apps/megameal/public/generated/hunyuan3d'
const importedRoot = 'apps/megameal/public/models'
const transformFields: Array<'position' | 'rotation' | 'scale'> = [
  'position',
  'rotation',
  'scale',
]

$: hasSingleSelection = !!selectedNode && selectedNodes.length <= 1
$: hasMultiSelection = selectedNodes.length > 1
$: hasGeometryNode = !!(
  selectedNode?.asset ||
  selectedNode?.prefab ||
  selectedNode?.primitive
)
$: canConvertSelectedToMesh = !!(selectedNode?.primitive || selectedNode?.prefab)
$: filteredAssetBrowserItems = assetBrowserItems.filter(
  item =>
    !assetBrowserFilter.trim() ||
    item.name.toLowerCase().includes(assetBrowserFilter.trim().toLowerCase()),
)
</script>

{#if hasSingleSelection && selectedNode}
  <div class="editor-section">
    <div class="label">Inspector</div>
    <input class="text-input" value={selectedNode.name} on:input={(e) => onNameChange((e.currentTarget as HTMLInputElement).value)} />
    <label class="checkbox"><input type="checkbox" checked={selectedNode.visible} on:change={(e) => onVisibleChange((e.currentTarget as HTMLInputElement).checked)} /> Visible</label>
    {#if hasGeometryNode}
      <div class="tuple-group editor-mt-sm">
        <div class="tuple-label">Object Description</div>
        <input class="text-input" value={styleDescriptor} on:input={(e) => onStyleDescriptorChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Style Prompt</div>
        <textarea
          rows="3"
          bind:value={hunyuanPrompt}
          placeholder="Describe the new style, material, shape language, or mood for this object."
        ></textarea>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button on:click={onConvertSelectedToMesh} disabled={!canConvertSelectedToMesh}>Convert To Mesh</button>
        <button on:click={onReimagineSelected} disabled={!canUseAiMeshStudioSelection || hunyuanBusy}>
          {hunyuanBusy ? 'Reimagining…' : 'Reimagine Selected'}
        </button>
      </div>
    {/if}

    <div class="tuple-group">
      <div class="tuple-label">Parent</div>
      <select class="text-input" value={selectedNode.parentId ?? ''} on:change={(e) => onParentChange((e.currentTarget as HTMLSelectElement).value)}>
        <option value="">Scene Root</option>
        {#each parentCandidates as candidate (candidate.id)}
          <option value={candidate.id}>{candidate.name}</option>
        {/each}
      </select>
    </div>

    {#if selectedNode.prefab}
      <div class="tuple-group">
        <div class="tuple-label">Prefab Type</div>
        <input class="text-input" value={selectedNode.prefab.type} readonly />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Prefab Variant</div>
        <input class="text-input" value={selectedNode.prefab.variant ?? ''} on:input={(e) => onPrefabVariantChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
    {/if}

    {#if selectedNode.asset}
      <div class="tuple-group">
        <div class="tuple-label">Asset URL</div>
        <input class="text-input" value={selectedNode.asset.url} on:input={(e) => onAssetUrlChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <EditorAssetPreview
        assetUrl={selectedNode.asset.url}
        label="Inspector Mesh Preview"
        hint="Live preview of the asset currently assigned to this node."
      />
      <div class="button-row compact-two-columns editor-mt-sm">
        <button on:click={onOpenGeneratedAssetPicker}>Select Generated</button>
        <button on:click={onOpenImportedAssetPicker}>Browse Imported</button>
      </div>
      <div class="save-message">Use the picker buttons to swap this object to another asset from the library instead of typing paths manually. Generated picks open the current asset folder when possible.</div>
      {#if assetPickerTargetNodeId === selectedNode.id}
        <div class="editor-subsection editor-mt-sm">
          <div class="tuple-label">Replacement Asset Picker</div>
          <div class="button-row compact editor-mb-sm">
            <button class:active={assetBrowserPath.startsWith(generatedRoot)} on:click={() => onAssetLibraryRootSelect(generatedRoot)}>Generated Assets</button>
            <button class:active={assetBrowserPath.startsWith(importedRoot)} on:click={() => onAssetLibraryRootSelect(importedRoot)}>Imported Models</button>
            <button on:click={onAssetBrowserUp}>Up</button>
            <button on:click={onAssetBrowserRefresh}>Refresh</button>
          </div>
          <div class="save-message path-label">{assetBrowserPath}</div>
          <div class="tuple-group editor-mb-sm">
            <div class="tuple-label">Filter</div>
            <input class="text-input" value={assetBrowserFilter} placeholder="Filter asset names" on:input={(e) => onAssetBrowserFilterChange((e.currentTarget as HTMLInputElement).value)} />
          </div>
          {#if assetBrowserError}
            <div class="save-message error-message">{assetBrowserError}</div>
          {/if}
          <div class="hierarchy-list asset-browser-list">
            {#if assetBrowserLoading}
              <div class="save-message">Loading assets…</div>
            {:else}
              {#each filteredAssetBrowserItems as item (item.path)}
                <button class:active={selectedLibraryItemPath === item.path} on:click={() => onAssetLibraryItemSelect(item)}>
                  <span class="node-label">{item.isDirectory ? '📁' : '📦'} {item.name}</span>
                  <span class="kind">{item.isDirectory ? 'dir' : 'asset'}</span>
                </button>
              {/each}
            {/if}
          </div>
          <div class="button-row compact editor-mt-sm">
            <button on:click={onApplySelectedLibraryAsset} disabled={!selectedLibraryItemPath}>Replace With Selected Asset</button>
            <button on:click={onCancelAssetPicker}>Cancel</button>
          </div>
        </div>
      {/if}
    {/if}

    {#if hasGeometryNode}
      <div class="tuple-group">
        <div class="tuple-label">Style Descriptor</div>
        <input class="text-input" value={styleDescriptor} on:input={(e) => onStyleDescriptorChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="save-message">Describe what this object actually is. The AI style batch should restyle this object, not turn everything into a tree.</div>
    {/if}

    {#if selectedNode.primitive}
      <div class="tuple-group">
        <div class="tuple-label">Primitive Geometry</div>
        <input class="text-input" value={selectedNode.primitive.geometry} on:input={(e) => onPrimitiveGeometryChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Primitive Args</div>
        <div class="tuple-row dynamic-grid">
          {#each selectedNode.primitive.args as arg, index}
            <input class="tuple-input" type="number" step="0.05" value={arg} on:change={(e) => onPrimitiveArgChange(index, (e.currentTarget as HTMLInputElement).value)} />
          {/each}
        </div>
      </div>
    {/if}

    {#if hasGeometryNode}
      <div class="tuple-group">
        <div class="tuple-label">Physics</div>
        <label class="checkbox"><input type="checkbox" checked={!!effectiveCollision} on:change={(e) => onCollisionEnabledChange((e.currentTarget as HTMLInputElement).checked)} /> Solid / Collider</label>
        <select class="text-input" value={selectedNode.physics?.bodyType ?? 'fixed'} on:change={(e) => onPhysicsBodyTypeChange((e.currentTarget as HTMLSelectElement).value)}>
          <option value="fixed">Fixed</option>
          <option value="dynamic">Dynamic</option>
          <option value="kinematicPosition">Kinematic</option>
        </select>
        <div class="tuple-row">
          <input class="tuple-input" type="number" step="0.1" value={selectedNode.physics?.gravityScale ?? 1} on:change={(e) => onPhysicsNumericChange('gravityScale', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.physics?.linearDamping ?? 0} on:change={(e) => onPhysicsNumericChange('linearDamping', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.physics?.angularDamping ?? 0} on:change={(e) => onPhysicsNumericChange('angularDamping', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-row">
          <label class="checkbox"><input type="checkbox" checked={selectedNode.physics?.canSleep ?? true} on:change={(e) => onPhysicsBooleanChange('canSleep', (e.currentTarget as HTMLInputElement).checked)} /> Sleep</label>
          <label class="checkbox"><input type="checkbox" checked={selectedNode.physics?.ccd ?? false} on:change={(e) => onPhysicsBooleanChange('ccd', (e.currentTarget as HTMLInputElement).checked)} /> CCD</label>
        </div>
        <div class="tuple-row">
          <label class="checkbox"><input type="checkbox" checked={selectedNode.physics?.lockRotations ?? false} on:change={(e) => onPhysicsBooleanChange('lockRotations', (e.currentTarget as HTMLInputElement).checked)} /> Lock Rotations</label>
          <label class="checkbox"><input type="checkbox" checked={selectedNode.physics?.lockTranslations ?? false} on:change={(e) => onPhysicsBooleanChange('lockTranslations', (e.currentTarget as HTMLInputElement).checked)} /> Lock Translations</label>
        </div>
        {#if effectiveCollision && effectiveCollision.shape !== 'trimesh'}
          <div class="tuple-label">Collider Size</div>
          <div class="tuple-row">
            {#each [0, 1, 2] as index}
              <input class="tuple-input" type="number" min="0.05" step="0.05" value={effectiveCollision.size?.[index] ?? selectedNodeColliderSize[index]} on:change={(e) => onCollisionSizeChange(index, (e.currentTarget as HTMLInputElement).value)} />
            {/each}
          </div>
          <div class="tuple-row">
            <input class="tuple-input" type="number" min="0" step="0.05" value={effectiveCollision.friction ?? 0.7} on:change={(e) => onCollisionNumericChange('friction', (e.currentTarget as HTMLInputElement).value)} />
            <input class="tuple-input" type="number" min="0" step="0.05" value={effectiveCollision.restitution ?? 0} on:change={(e) => onCollisionNumericChange('restitution', (e.currentTarget as HTMLInputElement).value)} />
          </div>
          <label class="checkbox"><input type="checkbox" checked={effectiveCollision.sensor ?? false} on:change={(e) => onCollisionBooleanChange('sensor', (e.currentTarget as HTMLInputElement).checked)} /> Sensor Only</label>
          <button on:click={onRecalculateCollision}>Match Collider To Visual</button>
        {:else if effectiveCollision}
          <div class="tuple-row">
            <input class="tuple-input" type="number" min="0" step="0.05" value={effectiveCollision.friction ?? 0.7} on:change={(e) => onCollisionNumericChange('friction', (e.currentTarget as HTMLInputElement).value)} />
            <input class="tuple-input" type="number" min="0" step="0.05" value={effectiveCollision.restitution ?? 0} on:change={(e) => onCollisionNumericChange('restitution', (e.currentTarget as HTMLInputElement).value)} />
          </div>
          <label class="checkbox"><input type="checkbox" checked={effectiveCollision.sensor ?? false} on:change={(e) => onCollisionBooleanChange('sensor', (e.currentTarget as HTMLInputElement).checked)} /> Sensor Only</label>
        {/if}
      </div>

      <div class="tuple-group">
        <div class="tuple-label">Material Color</div>
        <input class="text-input" type="color" value={selectedNodeMaterial.color ?? '#ffffff'} on:input={(e) => onMaterialColorChange('color', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Emissive</div>
        <input class="text-input" type="color" value={selectedNodeMaterial.emissive ?? '#000000'} on:input={(e) => onMaterialColorChange('emissive', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row">
        <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.emissiveIntensity ?? 0} on:change={(e) => onMaterialNumericChange('emissiveIntensity', (e.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.metalness ?? 0.5} on:change={(e) => onMaterialNumericChange('metalness', (e.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.roughness ?? 0.5} on:change={(e) => onMaterialNumericChange('roughness', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row">
        <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.opacity ?? 1} on:change={(e) => onMaterialNumericChange('opacity', (e.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.envMapIntensity ?? 1} on:change={(e) => onMaterialNumericChange('envMapIntensity', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row">
        <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.transmission ?? 0} on:change={(e) => onMaterialNumericChange('transmission', (e.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" min="1" max="2.5" step="0.05" value={selectedNodeMaterial.ior ?? 1.5} on:change={(e) => onMaterialNumericChange('ior', (e.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.reflectivity ?? 0.5} on:change={(e) => onMaterialNumericChange('reflectivity', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row">
        <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.clearcoat ?? 0} on:change={(e) => onMaterialNumericChange('clearcoat', (e.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" min="0" max="1" step="0.05" value={selectedNodeMaterial.clearcoatRoughness ?? 0} on:change={(e) => onMaterialNumericChange('clearcoatRoughness', (e.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" min="0" step="0.05" value={selectedNodeMaterial.thickness ?? 0} on:change={(e) => onMaterialNumericChange('thickness', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row">
        <label class="checkbox"><input type="checkbox" checked={selectedNodeMaterial.transparent ?? false} on:change={(e) => onMaterialBooleanChange('transparent', (e.currentTarget as HTMLInputElement).checked)} /> Transparent</label>
        <label class="checkbox"><input type="checkbox" checked={selectedNodeMaterial.wireframe ?? false} on:change={(e) => onMaterialBooleanChange('wireframe', (e.currentTarget as HTMLInputElement).checked)} /> Wireframe</label>
      </div>
      <div class="tuple-row">
        <label class="checkbox"><input type="checkbox" checked={selectedNodeMaterial.doubleSided ?? false} on:change={(e) => onMaterialBooleanChange('doubleSided', (e.currentTarget as HTMLInputElement).checked)} /> Double Sided</label>
        <label class="checkbox"><input type="checkbox" checked={selectedNodeMaterial.flatShading ?? false} on:change={(e) => onMaterialBooleanChange('flatShading', (e.currentTarget as HTMLInputElement).checked)} /> Flat Shading</label>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Base Color Map</div>
        <div class="button-row level-switch-row">
          <input class="text-input" placeholder="/textures/stone/albedo.jpg" value={selectedNodeMaterial.mapUrl ?? ''} on:input={(e) => onMaterialTextureChange('mapUrl', (e.currentTarget as HTMLInputElement).value)} />
          <button on:click={() => onOpenTexturePicker('mapUrl')}>Pick</button>
        </div>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Normal Map</div>
        <div class="button-row level-switch-row">
          <input class="text-input" placeholder="/textures/stone/normal.jpg" value={selectedNodeMaterial.normalMapUrl ?? ''} on:input={(e) => onMaterialTextureChange('normalMapUrl', (e.currentTarget as HTMLInputElement).value)} />
          <button on:click={() => onOpenTexturePicker('normalMapUrl')}>Pick</button>
        </div>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Roughness Map</div>
        <div class="button-row level-switch-row">
          <input class="text-input" placeholder="/textures/stone/roughness.jpg" value={selectedNodeMaterial.roughnessMapUrl ?? ''} on:input={(e) => onMaterialTextureChange('roughnessMapUrl', (e.currentTarget as HTMLInputElement).value)} />
          <button on:click={() => onOpenTexturePicker('roughnessMapUrl')}>Pick</button>
        </div>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Metalness Map</div>
        <div class="button-row level-switch-row">
          <input class="text-input" placeholder="/textures/stone/metalness.jpg" value={selectedNodeMaterial.metalnessMapUrl ?? ''} on:input={(e) => onMaterialTextureChange('metalnessMapUrl', (e.currentTarget as HTMLInputElement).value)} />
          <button on:click={() => onOpenTexturePicker('metalnessMapUrl')}>Pick</button>
        </div>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Emissive Map</div>
        <div class="button-row level-switch-row">
          <input class="text-input" placeholder="/textures/signs/emissive.png" value={selectedNodeMaterial.emissiveMapUrl ?? ''} on:input={(e) => onMaterialTextureChange('emissiveMapUrl', (e.currentTarget as HTMLInputElement).value)} />
          <button on:click={() => onOpenTexturePicker('emissiveMapUrl')}>Pick</button>
        </div>
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Alpha Map</div>
        <div class="button-row level-switch-row">
          <input class="text-input" placeholder="/textures/fabric/alpha.png" value={selectedNodeMaterial.alphaMapUrl ?? ''} on:input={(e) => onMaterialTextureChange('alphaMapUrl', (e.currentTarget as HTMLInputElement).value)} />
          <button on:click={() => onOpenTexturePicker('alphaMapUrl')}>Pick</button>
        </div>
      </div>
      {#if activeTextureMaterialField}
        <div class="tuple-group">
          <div class="tuple-label">Texture Browser</div>
          <div class="button-row compact">
            <button on:click={onTextureBrowserUp}>Up</button>
            <button on:click={onTextureBrowserRefresh}>Refresh</button>
          </div>
          <div class="save-message path-label">{textureBrowserPath}</div>
          <div class="save-message">Picking for `{activeTextureMaterialField}`. Click any image below to apply it.</div>
          {#if textureBrowserError}
            <div class="save-message error-message">{textureBrowserError}</div>
          {/if}
          <div class="hierarchy-list asset-browser-list">
            {#if textureBrowserLoading}
              <div class="save-message">Loading textures…</div>
            {:else}
              {#each textureBrowserItems as item (item.path)}
                <button on:click={() => item.isDirectory ? onTextureBrowserOpenDirectory(item.path) : onTextureBrowserPick(item)}>
                  <span class="node-label">{item.isDirectory ? '📁' : '🖼️'} {item.name}</span>
                  <span class="kind">{item.isDirectory ? 'dir' : 'texture'}</span>
                </button>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
      <button on:click={onResetMaterialOverrides}>Reset Material Overrides</button>
    {/if}

    {#if selectedNode.light}
      <div class="tuple-group">
        <div class="tuple-label">Light Color</div>
        <input class="text-input" value={selectedNode.light.color} on:input={(e) => onLightFieldChange('color', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group"><div class="tuple-label">Light Intensity</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.light.intensity} on:change={(e) => onLightNumericChange('intensity', (e.currentTarget as HTMLInputElement).value)} /></div>
      <div class="tuple-group"><div class="tuple-label">Light Distance</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.light.distance} on:change={(e) => onLightNumericChange('distance', (e.currentTarget as HTMLInputElement).value)} /></div>
      <div class="tuple-group"><div class="tuple-label">Light Decay</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.light.decay} on:change={(e) => onLightNumericChange('decay', (e.currentTarget as HTMLInputElement).value)} /></div>
    {/if}

    {#if selectedNode.gameplay}
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
      {:else if selectedNode.gameplay.type === 'firefly'}
        <div class="tuple-group"><div class="tuple-label">Title</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Author</div><input class="text-input" value={selectedNode.gameplay.author ?? ''} on:input={(e) => onGameplayFieldChange('author', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Location</div><input class="text-input" value={selectedNode.gameplay.location ?? ''} on:input={(e) => onGameplayFieldChange('location', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Excerpt</div><textarea rows="3" value={selectedNode.gameplay.excerpt ?? ''} on:input={(e) => onGameplayFieldChange('excerpt', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></div>
        <div class="tuple-group"><div class="tuple-label">Body</div><textarea rows="5" value={selectedNode.gameplay.body ?? ''} on:input={(e) => onGameplayFieldChange('body', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></div>
        <label class="checkbox"><input type="checkbox" checked={selectedNode.gameplay.wanderEnabled ?? true} on:change={(e) => onGameplayBooleanChange('wanderEnabled', (e.currentTarget as HTMLInputElement).checked)} /> Wander</label>
        <div class="tuple-group"><div class="tuple-label">Wander Radius</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.wanderRadius ?? 0.16} on:change={(e) => onGameplayNumericChange('wanderRadius', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Wander Speed</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.wanderSpeed ?? 0.18} on:change={(e) => onGameplayNumericChange('wanderSpeed', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Glow Intensity</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.lightIntensity ?? 1.15} on:change={(e) => onGameplayNumericChange('lightIntensity', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Glow Distance</div><input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.lightDistance ?? 4.6} on:change={(e) => onGameplayNumericChange('lightDistance', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Glow Decay</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.lightDecay ?? 1.25} on:change={(e) => onGameplayNumericChange('lightDecay', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Sprite Intensity</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.spriteIntensity ?? 1.15} on:change={(e) => onGameplayNumericChange('spriteIntensity', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Burst Glow Boost</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.lightBurstBoost ?? 1.25} on:change={(e) => onGameplayNumericChange('lightBurstBoost', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Hover Height</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.hoverHeight ?? 0.28} on:change={(e) => onGameplayNumericChange('hoverHeight', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Bob Amplitude</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.bobAmplitude ?? 0.08} on:change={(e) => onGameplayNumericChange('bobAmplitude', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Bob Speed</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.bobSpeed ?? 0.55} on:change={(e) => onGameplayNumericChange('bobSpeed', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Twinkle Speed</div><input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.twinkleSpeed ?? 0.9} on:change={(e) => onGameplayNumericChange('twinkleSpeed', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="save-message">Adjust luminance with the glow controls, use burst glow boost for the player light-release reaction, and tune motion with wander/hover/bob/twinkle controls.</div>
      {:else if selectedNode.gameplay.type === 'note'}
        <div class="tuple-group"><div class="tuple-label">Title</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Author</div><input class="text-input" value={selectedNode.gameplay.author ?? ''} on:input={(e) => onGameplayFieldChange('author', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Location</div><input class="text-input" value={selectedNode.gameplay.location ?? ''} on:input={(e) => onGameplayFieldChange('location', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Excerpt</div><textarea rows="3" value={selectedNode.gameplay.excerpt ?? ''} on:input={(e) => onGameplayFieldChange('excerpt', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></div>
        <div class="tuple-group"><div class="tuple-label">Body</div><textarea rows="5" value={selectedNode.gameplay.body ?? ''} on:input={(e) => onGameplayFieldChange('body', (e.currentTarget as HTMLTextAreaElement).value)}></textarea></div>
      {:else if selectedNode.gameplay.type === 'audio-region'}
        <div class="tuple-group"><div class="tuple-label">Region Label</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group">
          <div class="tuple-label">Ambient Track</div>
          <select class="text-input" value={selectedNode.gameplay.audioTrack ?? ambientAudioLibrary[0]?.src ?? ''} on:change={(e) => onGameplayFieldChange('audioTrack', (e.currentTarget as HTMLSelectElement).value)}>
            {#each ambientAudioLibrary as track}
              <option value={track.src}>{track.label}</option>
            {/each}
          </select>
        </div>
        <div class="tuple-row compact-two editor-mt-sm">
          <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.audioVolume ?? 0.24} on:change={(e) => onGameplayNumericChange('audioVolume', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.regionFalloff ?? 12} on:change={(e) => onGameplayNumericChange('regionFalloff', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="save-message">Use node position + scale to shape the region. Scale controls the box volume; falloff softens the edge.</div>
      {:else if selectedNode.gameplay.type === 'fog-volume'}
        <div class="tuple-group"><div class="tuple-label">Volume Label</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Fog Color</div><input class="text-input" type="color" value={selectedNode.gameplay.fogColor ?? '#9ba9bb'} on:input={(e) => onGameplayFieldChange('fogColor', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-row compact-two editor-mt-sm">
          <input class="tuple-input" type="number" step="0.0001" value={selectedNode.gameplay.fogDensity ?? 0.0025} on:change={(e) => onGameplayNumericChange('fogDensity', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.regionFalloff ?? 8} on:change={(e) => onGameplayNumericChange('regionFalloff', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="save-message">Use node position + scale to shape the fog box. Density and falloff control how strongly it blends.</div>
      {:else if selectedNode.gameplay.type === 'mist-region'}
        <div class="tuple-group"><div class="tuple-label">Mist Label</div><input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-group"><div class="tuple-label">Mist Color</div><input class="text-input" type="color" value={selectedNode.gameplay.mistColor ?? '#241557'} on:input={(e) => onGameplayFieldChange('mistColor', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="tuple-row compact-two editor-mt-sm">
          <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.mistOpacity ?? 0.14} on:change={(e) => onGameplayNumericChange('mistOpacity', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="1" value={selectedNode.gameplay.mistLayers ?? 3} on:change={(e) => onGameplayNumericChange('mistLayers', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-row compact-two editor-mt-sm">
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.mistSpacing ?? 0.45} on:change={(e) => onGameplayNumericChange('mistSpacing', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="10" value={selectedNode.gameplay.mistScale ?? 360} on:change={(e) => onGameplayNumericChange('mistScale', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group editor-mt-sm"><div class="tuple-label">Mist Drift</div><input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.mistDriftSpeed ?? 0.05} on:change={(e) => onGameplayNumericChange('mistDriftSpeed', (e.currentTarget as HTMLInputElement).value)} /></div>
        <div class="save-message">Move the node to reposition the mist. Toggle visibility to hide it, or delete the node to remove it entirely.</div>
      {/if}
    {/if}

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
              on:change={(e) => onTransformChange(field, index, (e.currentTarget as HTMLInputElement).value)}
            />
          {/each}
        </div>
      </div>
    {/each}

    <div class="button-row compact">
      <button on:click={onDuplicate}>Duplicate</button>
      <button class="danger" on:click={onDelete}>Delete</button>
    </div>
  </div>
{:else if hasMultiSelection}
  <div class="editor-section">
    <div class="label">Inspector</div>
    <div class="save-message">Multi-selection active. Transform, duplicate, delete, reparent, and save are available. Detailed property editing is limited to single selection for now.</div>
    <div class="tuple-group">
      <div class="tuple-label">Parent</div>
      <select class="text-input" value="" on:change={(e) => onParentChange((e.currentTarget as HTMLSelectElement).value)}>
        <option value="">Scene Root</option>
        {#each multiParentCandidates as candidate (candidate.id)}
          <option value={candidate.id}>{candidate.name}</option>
        {/each}
      </select>
    </div>
  </div>
{/if}
