<script lang="ts">
import { resolveSceneFireflyFieldQuality } from '../engine/sceneFireflyField'
import EditorFireflyFieldControls from './EditorFireflyFieldControls.svelte'
import EditorNpcSection from './EditorNpcSection.svelte'
import type { EditorNpcPatch } from './editorNpcControls'
import type {
  EditorSceneDocument,
  EditorSceneNode,
  SharedLevelEditorSettings,
} from './editorTypes'

export let levelId = ''
export let editorScene: EditorSceneDocument | null = null
export let selectedNode: EditorSceneNode | null = null
export let selectedNodes: EditorSceneNode[] = []
export let levelSettings: SharedLevelEditorSettings
export let updateLevelSetting: (
  path: Array<string | number>,
  value: unknown,
) => void = () => {}
export let updateLevelNumericSetting: (
  path: Array<string | number>,
  value: string,
) => void = () => {}
export let onNpcChange: (patch: EditorNpcPatch) => void = () => {}
export let onAddFirefly: () => void = () => {}
export let onAddFireflyToSelection: () => void = () => {}
export let onDuplicateSelection: () => void = () => {}
export let onRemoveSelectedNpc: () => void = () => {}
export let onSelectNode: (nodeId: string) => void = () => {}

$: sceneNodes = editorScene?.nodes ?? []
$: npcNodes = sceneNodes.filter(node => Boolean(node.npc))
$: fireflyNpcNodes = npcNodes.filter(node => node.npc?.archetype === 'firefly')
$: selectedNpcNode = selectedNode?.npc ? selectedNode : null
$: selectedFireflyFieldQuality = resolveSceneFireflyFieldQuality({
  settings: levelSettings.fireflies,
  qualityTier: 'high',
  defaultCount: 36,
  defaultLightCount: 8,
  defaultSize: 0.58,
  defaultSpriteIntensity: 1.45,
})
$: selectedNodesWithoutNpc = selectedNodes.filter(node => !node.npc).length
$: fieldEnabled =
  levelSettings.fireflies?.enabled ?? levelSettings.features?.fireflies ?? false
$: selectedFireflyActivePercent = `${(selectedFireflyFieldQuality.activeLightPercent * 100).toFixed(1).replace(/\.0$/, '')}%`
</script>

<div class="editor-section">
  <div class="label">NPC System</div>
  <div class="editor-status-card">
    <div class="editor-status-title">{levelId || 'Untitled level'} NPC workspace</div>
    <div class="save-message">
      {npcNodes.length} authored NPC(s) · {fireflyNpcNodes.length} firefly NPC(s) · field {fieldEnabled ? 'enabled' : 'disabled'}
    </div>
    <div class="editor-chip-row">
      <span class:ready={npcNodes.length > 0} class:warn={npcNodes.length === 0} class="editor-chip">
        authored {npcNodes.length}
      </span>
      <span class:ready={fieldEnabled} class:warn={!fieldEnabled} class="editor-chip">
        field {fieldEnabled ? 'on' : 'off'}
      </span>
      <span class="editor-chip">
        high tier {selectedFireflyFieldQuality.count} · {selectedFireflyActivePercent} active ({selectedFireflyFieldQuality.activeLightCount})
      </span>
    </div>
  </div>
  <div class="button-row compact editor-mt-sm">
    <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onAddFirefly}>Add NPC Firefly</button>
    <button data-sfx-hover="hover-soft" data-sfx-click="confirm" disabled={selectedNodes.length === 0} on:click={onAddFireflyToSelection}>
      Add Firefly To Selection
    </button>
    <button data-sfx-hover="hover-soft" data-sfx-click="select" disabled={!selectedNpcNode} on:click={onDuplicateSelection}>
      Duplicate Selected NPC
    </button>
    <button class="danger" data-sfx-hover="hover-soft" data-sfx-click="delete" disabled={!selectedNpcNode} on:click={onRemoveSelectedNpc}>
      Remove NPC Component
    </button>
  </div>
  {#if selectedNodesWithoutNpc > 0}
    <div class="save-message">{selectedNodesWithoutNpc} selected object(s) can receive child firefly NPCs.</div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">Authored NPCs</div>
  {#if npcNodes.length === 0}
    <div class="save-message">No authored NPC nodes in this scene. Use Add NPC Firefly or configure the NPC Firefly Field below.</div>
  {:else}
    <div class="button-grid">
      {#each npcNodes as node (node.id)}
        <button
          class:active={selectedNode?.id === node.id}
          data-sfx-hover="hover-soft"
          data-sfx-click="select"
          on:click={() => onSelectNode(node.id)}
        >
          <span>{node.npc?.displayName ?? node.name}</span>
          <span>{node.npc?.archetype ?? 'npc'} · {node.npc?.interaction.mode ?? 'disabled'}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<div class="editor-section">
  <div class="label">Selected NPC</div>
  {#if selectedNpcNode?.npc}
    <EditorNpcSection npc={selectedNpcNode.npc} {onNpcChange} />
  {:else}
    <div class="save-message">Select an authored NPC node to edit identity, conversation, movement, and presentation.</div>
  {/if}
</div>

<EditorFireflyFieldControls
  {levelSettings}
  {updateLevelSetting}
  {updateLevelNumericSetting}
/>
