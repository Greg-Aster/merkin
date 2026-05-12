<script lang="ts">
export let metadataTitle = ''
export let metadataStatus: 'active' | 'draft' | 'archived' = 'draft'
export let metadataDeployed = false
export let metadataStarMapEnabled = false
export let metadataStarMapYear = 2100
export let metadataStarMapDescription = ''
export let metadataSourceKind: 'scene' = 'scene'
export let saveAsTitle = ''
export let saveAsLevelId = ''
export let importBuffer = ''
export let saveMessage = ''

export let onSaveLevelMetadata: () => void = () => {}
export let onSaveLocal: () => void = () => {}
export let onOverwriteLevel: () => void = () => {}
export let onCopySceneJson: () => void = () => {}
export let onReloadDisk: () => void = () => {}
export let onLoadPackagedScene: () => void = () => {}
export let onLoadOriginalSnapshot: () => void = () => {}
export let onLoadBackupSnapshot: () => void = () => {}
export let onSaveAsNewLevel: () => void = () => {}
export let onApplyImport: () => void = () => {}

$: if (metadataStatus !== 'active') {
  metadataDeployed = false
  metadataStarMapEnabled = false
}

$: if (!metadataDeployed) {
  metadataStarMapEnabled = false
}
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
  <label class="checkbox"><input type="checkbox" bind:checked={metadataDeployed} data-sfx-click="soft" disabled={metadataStatus !== 'active'} /> Published / playable</label>
  <label class="checkbox"><input type="checkbox" bind:checked={metadataStarMapEnabled} data-sfx-click="soft" disabled={!metadataDeployed || metadataStatus !== 'active'} /> Star navigation</label>
  <div class="tuple-group">
    <div class="tuple-label">Runtime Source</div>
    <select class="text-input" bind:value={metadataSourceKind} data-sfx-focus="focus-soft">
      <option value="scene">Scene File</option>
    </select>
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Star Year</div>
    <input class="tuple-input" type="number" bind:value={metadataStarMapYear} data-sfx-focus="focus-soft" disabled={!metadataStarMapEnabled || !metadataDeployed} />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Star Description</div>
    <input class="text-input" bind:value={metadataStarMapDescription} data-sfx-focus="focus-soft" disabled={!metadataStarMapEnabled || !metadataDeployed} />
  </div>
  <button class="full" data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onSaveLevelMetadata}>Save Level Metadata</button>
  <div class="save-message">Draft and archived levels stay editor-only. Active published levels are playable; active published star-navigation levels get a star.</div>
</div>

<div class="editor-section">
  <div class="label">Persistence</div>
  <div class="button-grid">
    <button data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onOverwriteLevel}>Save Level</button>
    <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onSaveLocal}>Save Local Recovery</button>
    <button data-sfx-hover="hover-soft" data-sfx-click="confirm" on:click={onCopySceneJson}>Copy JSON</button>
    <button data-sfx-hover="hover-soft" data-sfx-click="warning" on:click={onReloadDisk}>Load Current Level</button>
    <button data-sfx-hover="hover-emphasis" data-sfx-click="warning" on:click={onLoadPackagedScene}>Load Packaged Scene</button>
    <button data-sfx-hover="hover-emphasis" data-sfx-click="warning" on:click={onLoadOriginalSnapshot}>Load Original Snapshot</button>
    <button data-sfx-hover="hover-emphasis" data-sfx-click="warning" on:click={onLoadBackupSnapshot}>Load Backup Snapshot</button>
  </div>
  <div class="tuple-group editor-mt-lg">
    <div class="tuple-label">Save As Title</div>
    <input class="text-input" bind:value={saveAsTitle} data-sfx-focus="focus-soft" placeholder="Display name" />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Save As Level ID</div>
    <input class="text-input" bind:value={saveAsLevelId} data-sfx-focus="focus-soft" placeholder="new-level-id" />
  </div>
  <button class="full" data-sfx-hover="hover-emphasis" data-sfx-click="confirm" on:click={onSaveAsNewLevel}>Save As</button>
  <textarea bind:value={importBuffer} rows="6" placeholder="Paste scene JSON here" data-sfx-focus="focus-soft"></textarea>
  <button class="full" data-sfx-hover="hover-emphasis" data-sfx-click="warning" on:click={onApplyImport}>Import JSON</button>
  <div class="save-message">{saveMessage}</div>
</div>
