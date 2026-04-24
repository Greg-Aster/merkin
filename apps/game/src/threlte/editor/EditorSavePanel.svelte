<script lang="ts">
export let metadataTitle = ''
export let metadataStatus: 'active' | 'draft' | 'archived' = 'draft'
export let metadataDeployed = false
export let metadataStarMapEnabled = false
export let metadataStarMapYear = 2100
export let metadataStarMapDescription = ''
export let metadataSourceKind: 'component' | 'scene' = 'scene'
export let metadataSourceComponentKey:
  | 'observatory'
  | 'sci-fi-room'
  | 'miranda'
  | 'solitude' = 'observatory'
export let saveAsTitle = ''
export let saveAsLevelId = ''
export let importBuffer = ''
export let saveMessage = ''

export let onSaveLevelMetadata: () => void = () => {}
export let onSaveLocal: () => void = () => {}
export let onOverwriteLevel: () => void = () => {}
export let onCopySceneJson: () => void = () => {}
export let onReloadDisk: () => void = () => {}
export let onResetDefault: () => void = () => {}
export let onSaveAsNewLevel: () => void = () => {}
export let onApplyImport: () => void = () => {}
</script>

<div class="editor-section">
  <div class="label">Level File</div>
  <div class="tuple-group">
    <div class="tuple-label">Title</div>
    <input class="text-input" bind:value={metadataTitle} data-sfx-focus="focus-soft" />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Status</div>
    <select class="text-input" bind:value={metadataStatus} data-sfx-focus="focus-soft">
      <option value="active">Active</option>
      <option value="draft">Draft</option>
      <option value="archived">Archived</option>
    </select>
  </div>
  <label class="checkbox"><input type="checkbox" bind:checked={metadataDeployed} data-sfx-click="soft" /> Deploy for gameplay</label>
  <label class="checkbox"><input type="checkbox" bind:checked={metadataStarMapEnabled} data-sfx-click="soft" disabled={!metadataDeployed} /> Show on star map</label>
  <div class="tuple-group">
    <div class="tuple-label">Runtime Source</div>
    <select class="text-input" bind:value={metadataSourceKind} data-sfx-focus="focus-soft">
      <option value="scene">Scene File</option>
      <option value="component">Built-In Runtime</option>
    </select>
  </div>
  {#if metadataSourceKind === 'component'}
    <div class="tuple-group">
      <div class="tuple-label">Built-In Level</div>
      <select class="text-input" bind:value={metadataSourceComponentKey} data-sfx-focus="focus-soft">
        <option value="observatory">Observatory</option>
        <option value="sci-fi-room">Sci Fi Room</option>
        <option value="miranda">Miranda Wreck</option>
        <option value="solitude">Solitude</option>
      </select>
    </div>
  {/if}
  <div class="tuple-group">
    <div class="tuple-label">Star Year</div>
    <input class="tuple-input" type="number" bind:value={metadataStarMapYear} data-sfx-focus="focus-soft" disabled={!metadataStarMapEnabled || !metadataDeployed} />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Star Description</div>
    <input class="text-input" bind:value={metadataStarMapDescription} data-sfx-focus="focus-soft" disabled={!metadataStarMapEnabled || !metadataDeployed} />
  </div>
  <button class="full" data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onSaveLevelMetadata}>Save Level Metadata</button>
  <div class="save-message">Levels can exist as drafts or archives without being deployed to players. Only deployed star-map levels get navigation stars.</div>
</div>

<div class="editor-section">
  <div class="label">Persistence</div>
  <div class="button-grid">
    <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onSaveLocal}>Save Local</button>
    <button data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onOverwriteLevel}>Overwrite Level</button>
    <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onCopySceneJson}>Copy JSON</button>
    <button data-sfx-hover="hover-soft" data-sfx-click="warning" on:click={onReloadDisk}>Reload Disk</button>
    <button data-sfx-hover="hover-emphasis" data-sfx-click="warning" on:click={onResetDefault}>Reset Default</button>
  </div>
  <div class="tuple-group editor-mt-lg">
    <div class="tuple-label">Save As Title</div>
    <input class="text-input" bind:value={saveAsTitle} data-sfx-focus="focus-soft" placeholder="Display name" />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Save As Level ID</div>
    <input class="text-input" bind:value={saveAsLevelId} data-sfx-focus="focus-soft" placeholder="new-level-id" />
  </div>
  <button class="full" data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onSaveAsNewLevel}>Save As New Level</button>
  <textarea bind:value={importBuffer} rows="6" placeholder="Paste scene JSON here" data-sfx-focus="focus-soft"></textarea>
  <button class="full" data-sfx-hover="hover-emphasis" data-sfx-click="warning" on:click={onApplyImport}>Import JSON</button>
  <div class="save-message">{saveMessage}</div>
</div>
