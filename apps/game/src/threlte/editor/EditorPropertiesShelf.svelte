<script lang="ts">
import type { CollisionChannel, CollisionIntent } from '../engine/types'
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
  | 'mistOpacity'
  | 'mistLayers'
  | 'mistSpacing'
  | 'mistScale'
  | 'mistDriftSpeed'
type GameplayBooleanField = 'wanderEnabled'

export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let parentCandidates: EditorSceneNode[] = []
export let selectedNodeMaterial: EditorMaterialData = {}
export let selectedNodePreviewAssetUrl = ''
export let selectedGeneratedVariantUrl = ''
export let styleDescriptor = ''
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
export let onLightNumericChange: (
  field: LightNumericField,
  value: string,
) => void = () => {}
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
  field: 'metalness' | 'roughness' | 'opacity',
  value: string,
) => void = () => {}
export let onMaterialTextureChange: (field: 'mapUrl', value: string) => void =
  () => {}
export let onOpenTexturePicker: (field: TextureField) => void = () => {}
export let onResetMaterialOverrides: () => void = () => {}

$: effectiveCollision = resolveNodeCollision(selectedNode)
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

const transformFields: Array<'position' | 'rotation' | 'scale'> = [
  'position',
  'rotation',
  'scale',
]
const collisionIntentOptions: Array<{ value: CollisionIntent; label: string }> =
  [
    { value: 'none', label: 'None' },
    { value: 'walkable', label: 'Walkable' },
    { value: 'blocker', label: 'Blocker' },
    { value: 'trigger', label: 'Trigger' },
    { value: 'detailMesh', label: 'Detail Mesh' },
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

$: hasSingleSelection = !!selectedNode && selectedNodes.length <= 1
$: hasMultiSelection = selectedNodes.length > 1
$: hasGeometryNode = !!(
  selectedNode?.asset ||
  selectedNode?.prefab ||
  selectedNode?.primitive
)
$: canConvertSelectedToMesh = !!(
  selectedNode?.primitive || selectedNode?.prefab
)
</script>

{#if hasSingleSelection && selectedNode}
  <div class="editor-section compact-surface">
    <div class="label">Selected Object</div>
    <input class="text-input" value={selectedNode.name} data-sfx-focus="focus-soft" on:input={(e) => onNameChange((e.currentTarget as HTMLInputElement).value)} />
    <div class="button-row compact editor-mt-sm">
      <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenStyleTab} disabled={!canUseStyleStudioSelection}>Style</button>
      <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenAiTab} disabled={!canUseAiMeshStudioSelection}>AI</button>
      <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onDuplicate}>Duplicate</button>
      <button class="danger" data-danger="true" data-sfx-hover="hover-emphasis" data-sfx-click="warning" on:click={onDelete}>Delete</button>
    </div>
    {#if hasGeometryNode}
      <div class="tuple-group editor-mt-sm">
        <div class="tuple-label">Object Description</div>
        <input class="text-input" value={styleDescriptor} data-sfx-focus="focus-soft" on:input={(e) => onStyleDescriptorChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Style Prompt</div>
        <textarea
          rows="3"
          bind:value={hunyuanPrompt}
          data-sfx-focus="focus-soft"
          placeholder="Describe the new style, material, shape language, or mood for this object."
        ></textarea>
      </div>
      <div class="button-row compact editor-mt-sm">
        <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onConvertSelectedToMesh} disabled={!canConvertSelectedToMesh}>Convert To Mesh</button>
        <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onReimagineSelected} disabled={!canUseAiMeshStudioSelection || hunyuanBusy}>
          {hunyuanBusy ? 'Reimagining…' : 'Reimagine Selected'}
        </button>
      </div>
    {/if}
    <label class="checkbox editor-mt-sm"><input type="checkbox" checked={selectedNode.visible} data-sfx-click="soft" on:change={(e) => onVisibleChange((e.currentTarget as HTMLInputElement).checked)} /> Visible</label>
  </div>

  {#if selectedNodePreviewAssetUrl}
    <EditorAssetPreview
      assetUrl={selectedGeneratedVariantUrl || selectedNodePreviewAssetUrl}
      label="Selection Preview"
      hint={selectedGeneratedVariantUrl && selectedGeneratedVariantUrl !== selectedNodePreviewAssetUrl
        ? 'Previewing the highlighted variant. Apply it to replace the current mesh.'
        : 'Live preview of the selected object mesh.'}
      height={170}
    />
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
  </div>

  <div class="editor-section compact-surface">
    <div class="label">Object</div>
    <div class="tuple-group">
      <div class="tuple-label">Parent</div>
      <select class="text-input" value={selectedNode.parentId ?? ''} data-sfx-focus="focus-soft" on:change={(e) => onParentChange((e.currentTarget as HTMLSelectElement).value)}>
        <option value="">Scene Root</option>
        {#each parentCandidates as candidate (candidate.id)}
          <option value={candidate.id}>{candidate.name}</option>
        {/each}
      </select>
    </div>
    {#if selectedNode.asset}
      <div class="tuple-group">
        <div class="tuple-label">Asset URL</div>
        <input class="text-input" value={selectedNode.asset.url} data-sfx-focus="focus-soft" on:input={(e) => onAssetUrlChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="button-row compact editor-mt-sm">
        <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenGeneratedAssetPicker}>Select Generated</button>
        <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenImportedAssetPicker}>Browse Imported</button>
      </div>
      <div class="save-message editor-mt-sm">Select Generated opens the current generated asset folder when possible so you can swap between sibling outputs quickly.</div>
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
    {/if}
  </div>

  {#if selectedNode.light}
    <div class="editor-section compact-surface">
      <div class="label">Light</div>
      <div class="tuple-group">
        <div class="tuple-label">Light Color</div>
        <input class="text-input" value={selectedNode.light.color} on:input={(e) => onLightColorChange((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Light Intensity</div>
        <input class="tuple-input" type="number" step="0.1" value={selectedNode.light.intensity} on:change={(e) => onLightNumericChange('intensity', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Light Distance</div>
        <input class="tuple-input" type="number" step="0.1" value={selectedNode.light.distance} on:change={(e) => onLightNumericChange('distance', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Light Decay</div>
        <input class="tuple-input" type="number" step="0.1" value={selectedNode.light.decay} on:change={(e) => onLightNumericChange('decay', (e.currentTarget as HTMLInputElement).value)} />
      </div>
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
      {:else if selectedNode.gameplay.type === 'firefly'}
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
        <label class="checkbox"><input type="checkbox" checked={selectedNode.gameplay.wanderEnabled ?? true} on:change={(e) => onGameplayBooleanChange('wanderEnabled', (e.currentTarget as HTMLInputElement).checked)} /> Wander</label>
        <div class="tuple-group">
          <div class="tuple-label">Wander Radius</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.wanderRadius ?? 0.16} on:change={(e) => onGameplayNumericChange('wanderRadius', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Wander Speed</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.wanderSpeed ?? 0.18} on:change={(e) => onGameplayNumericChange('wanderSpeed', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Glow Intensity</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.lightIntensity ?? 1.15} on:change={(e) => onGameplayNumericChange('lightIntensity', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Glow Distance</div>
          <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.lightDistance ?? 4.6} on:change={(e) => onGameplayNumericChange('lightDistance', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Glow Decay</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.lightDecay ?? 1.25} on:change={(e) => onGameplayNumericChange('lightDecay', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Sprite Intensity</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.spriteIntensity ?? 1.15} on:change={(e) => onGameplayNumericChange('spriteIntensity', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Burst Glow Boost</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.lightBurstBoost ?? 1.25} on:change={(e) => onGameplayNumericChange('lightBurstBoost', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Hover Height</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.hoverHeight ?? 0.28} on:change={(e) => onGameplayNumericChange('hoverHeight', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Bob Amplitude</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.bobAmplitude ?? 0.08} on:change={(e) => onGameplayNumericChange('bobAmplitude', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Bob Speed</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.bobSpeed ?? 0.55} on:change={(e) => onGameplayNumericChange('bobSpeed', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Twinkle Speed</div>
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.twinkleSpeed ?? 0.9} on:change={(e) => onGameplayNumericChange('twinkleSpeed', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="save-message">Glow controls drive nearby scene lighting; sprite intensity controls the visible core and halo; burst glow boost scales the player light-release reaction.</div>
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
        <div class="tuple-row">
          <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.audioVolume ?? 0.24} on:change={(e) => onGameplayNumericChange('audioVolume', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.regionFalloff ?? 12} on:change={(e) => onGameplayNumericChange('regionFalloff', (e.currentTarget as HTMLInputElement).value)} />
        </div>
      {:else if selectedNode.gameplay.type === 'fog-volume'}
        <div class="tuple-group">
          <div class="tuple-label">Volume Label</div>
          <input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Fog Color</div>
          <input class="text-input" value={selectedNode.gameplay.fogColor ?? '#9ba9bb'} on:input={(e) => onGameplayFieldChange('fogColor', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-row">
          <input class="tuple-input" type="number" step="0.0001" value={selectedNode.gameplay.fogDensity ?? 0.0025} on:change={(e) => onGameplayNumericChange('fogDensity', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="0.1" value={selectedNode.gameplay.regionFalloff ?? 8} on:change={(e) => onGameplayNumericChange('regionFalloff', (e.currentTarget as HTMLInputElement).value)} />
        </div>
      {:else if selectedNode.gameplay.type === 'mist-region'}
        <div class="tuple-group">
          <div class="tuple-label">Mist Label</div>
          <input class="text-input" value={selectedNode.gameplay.title ?? ''} on:input={(e) => onGameplayFieldChange('title', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group">
          <div class="tuple-label">Mist Color</div>
          <input class="text-input" value={selectedNode.gameplay.mistColor ?? '#241557'} on:input={(e) => onGameplayFieldChange('mistColor', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-row">
          <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.mistOpacity ?? 0.14} on:change={(e) => onGameplayNumericChange('mistOpacity', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="1" value={selectedNode.gameplay.mistLayers ?? 3} on:change={(e) => onGameplayNumericChange('mistLayers', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-row editor-mt-sm">
          <input class="tuple-input" type="number" step="0.05" value={selectedNode.gameplay.mistSpacing ?? 0.45} on:change={(e) => onGameplayNumericChange('mistSpacing', (e.currentTarget as HTMLInputElement).value)} />
          <input class="tuple-input" type="number" step="10" value={selectedNode.gameplay.mistScale ?? 360} on:change={(e) => onGameplayNumericChange('mistScale', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="tuple-group editor-mt-sm">
          <div class="tuple-label">Mist Drift</div>
          <input class="tuple-input" type="number" step="0.01" value={selectedNode.gameplay.mistDriftSpeed ?? 0.05} on:change={(e) => onGameplayNumericChange('mistDriftSpeed', (e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="save-message editor-mt-sm">Move the node to reposition the mist. Toggle `Visible` to hide it, or delete the node to remove it entirely.</div>
      {/if}
    </div>
  {/if}

  {#if selectedNode.asset?.url?.startsWith('/generated/')}
    <div class="editor-section compact-surface">
      <div class="label">Generated Variants</div>
      {#if generatedVariantError}
        <div class="save-message error-message">{generatedVariantError}</div>
      {/if}
      {#if generatedVariantLoading}
        <div class="save-message">Loading sibling variants…</div>
      {:else if generatedVariantItems.length === 0}
        <div class="save-message">No sibling `.glb` variants found in this folder.</div>
      {:else}
        <EditorAssetPreview
          assetUrl={selectedGeneratedVariantUrl || selectedNode.asset.url}
          label="Variant Preview"
          hint="Click any sibling version below to preview it, then apply it to the selected object."
          height={150}
        />
        <div class="hierarchy-list variant-list editor-mt-sm">
          {#each generatedVariantItems as item (item.path)}
            <button class:active={selectedGeneratedVariantUrl === item.url} data-sfx-hover="hover-soft" data-sfx-click="select" on:click={() => onSelectGeneratedVariant(item.url)}>
              <span class="node-label">{item.name}</span>
              <span class="kind">{item.url === selectedNode.asset.url ? 'current' : 'variant'}</span>
            </button>
          {/each}
        </div>
        <div class="button-row compact editor-mt-sm">
          <button data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={() => onApplyGeneratedVariant(selectedGeneratedVariantUrl)} disabled={!selectedGeneratedVariantUrl || selectedGeneratedVariantUrl === selectedNode.asset.url}>Apply Highlighted Variant</button>
          <button data-sfx-hover="hover-soft" data-sfx-click="panel-back" on:click={onResetGeneratedVariantPreview}>Reset Preview</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if canUseStyleStudioSelection}
    <div class="editor-section compact-surface">
      <div class="label">Blender Companion</div>
      <div class="button-row compact editor-mb-sm">
        <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenSelectedInBlender} disabled={styleBusy}>Open Selected In Blender</button>
        <button data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onExportBlenderPackage} disabled={styleBusy}>Export Package</button>
      </div>
      <div class="button-row compact">
        <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onReimportBlenderOutput} disabled={styleBusy}>Reimport Latest Blender Output</button>
        <button data-sfx-hover="hover-soft" data-sfx-click="panel-open" on:click={onOpenStyleTab}>Open Style Studio</button>
      </div>
      {#if styleBlenderExportPath}
        <div class="save-message editor-mt-sm path-label">{styleBlenderExportPath}</div>
      {/if}
      {#if styleBlenderOpenCommand}
        <div class="save-message path-label">{styleBlenderOpenCommand}</div>
      {/if}
      <div class="save-message">{styleStatus}</div>
    </div>
  {/if}

  {#if hasGeometryNode}
    <div class="editor-section compact-surface">
      <div class="label">Material</div>
      <div class="tuple-group">
        <div class="tuple-label">Base Color</div>
        <input class="text-input" type="color" value={selectedNodeMaterial.color ?? '#ffffff'} on:input={(e) => onMaterialColorChange('color', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-group">
        <div class="tuple-label">Emissive</div>
        <input class="text-input" type="color" value={selectedNodeMaterial.emissive ?? '#000000'} on:input={(e) => onMaterialColorChange('emissive', (e.currentTarget as HTMLInputElement).value)} />
      </div>
      <div class="tuple-row">
        <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.metalness ?? 0.5} on:change={(e) => onMaterialNumericChange('metalness', (e.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.roughness ?? 0.5} on:change={(e) => onMaterialNumericChange('roughness', (e.currentTarget as HTMLInputElement).value)} />
        <input class="tuple-input" type="number" step="0.05" value={selectedNodeMaterial.opacity ?? 1} on:change={(e) => onMaterialNumericChange('opacity', (e.currentTarget as HTMLInputElement).value)} />
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
      <div class="label">Physics</div>
      <label class="checkbox"><input type="checkbox" checked={!!effectiveCollision} data-sfx-click="soft" on:change={(e) => onCollisionEnabledChange((e.currentTarget as HTMLInputElement).checked)} /> Solid / Collider</label>
      <select class="text-input" value={selectedNode.collision?.intent ?? effectiveCollision?.intent ?? 'none'} data-sfx-focus="focus-soft" on:change={(e) => onCollisionIntentChange((e.currentTarget as HTMLSelectElement).value as CollisionIntent)}>
        {#each collisionIntentOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <select class="text-input" value={selectedNode.collision?.channel ?? effectiveCollision?.channel ?? 'worldStatic'} data-sfx-focus="focus-soft" on:change={(e) => onCollisionChannelChange((e.currentTarget as HTMLSelectElement).value as CollisionChannel)}>
        {#each collisionChannelOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      <select class="text-input" value={selectedNode.physics?.bodyType ?? 'fixed'} data-sfx-focus="focus-soft" on:change={(e) => onPhysicsBodyTypeChange((e.currentTarget as HTMLSelectElement).value)}>
        <option value="fixed">Fixed</option>
        <option value="dynamic">Dynamic</option>
        <option value="kinematicPosition">Kinematic</option>
      </select>
      {#if effectiveCollision && effectiveCollision.shape !== 'trimesh'}
        <div class="tuple-label editor-mt-sm">Collider Size</div>
        <div class="tuple-row">
          {#each [0, 1, 2] as index}
            <input class="tuple-input" type="number" min="0.05" step="0.05" value={colliderSize[index]} data-sfx-focus="focus-soft" on:change={(e) => onColliderSizeChange(index, (e.currentTarget as HTMLInputElement).value)} />
          {/each}
        </div>
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
    <div class="save-message">{selectedNodes.length} objects selected. Use the outliner, transform shortcuts, and scene tools for batch edits.</div>
  </div>
{:else}
  <div class="editor-section compact-surface">
    <div class="save-message">Select an object in the viewport or outliner to inspect it here.</div>
  </div>
{/if}
