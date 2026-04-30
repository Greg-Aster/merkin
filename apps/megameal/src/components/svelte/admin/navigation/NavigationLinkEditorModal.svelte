<script>
export let editingLink
export let linkPresets
export let onCancel
export let onSave
</script>

<div class="fixed inset-0 bg-black/50 dark:bg-black/60 z-50 flex items-center justify-center">
  <div class="bg-white dark:bg-neutral-800 rounded-lg max-w-lg w-full overflow-auto shadow-lg">
    <div class="p-5">
      <h3 class="text-xl font-semibold text-black/80 dark:text-white/80 mb-4">
        {editingLink.isNew ? 'Add Navigation Link' : 'Edit Navigation Link'}
      </h3>

      <div class="mb-4">
        <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Link Type</div>
        <div class="flex space-x-4">
          <label class="flex items-center">
            <input
              type="radio"
              name="link-type"
              value="preset"
              checked={editingLink.isPreset}
              on:change={() => { editingLink.isPreset = true }}
              class="h-4 w-4 text-[var(--primary)] border-neutral-300 dark:border-neutral-600"
            />
            <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Preset Link</span>
          </label>

          <label class="flex items-center">
            <input
              type="radio"
              name="link-type"
              value="custom"
              checked={!editingLink.isPreset}
              on:change={() => { editingLink.isPreset = false }}
              class="h-4 w-4 text-[var(--primary)] border-neutral-300 dark:border-neutral-600"
            />
            <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Custom Link</span>
          </label>
        </div>
      </div>

      {#if editingLink.isPreset}
        <div class="mb-4">
          <label for="preset-select" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Select Preset
          </label>
          <select
            id="preset-select"
            bind:value={editingLink.presetIndex}
            class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-l text-sm text-neutral-900 dark:text-neutral-100"
          >
            <option value={null} disabled>Select a preset...</option>
            {#each Object.entries(linkPresets) as [index, preset]}
              <option value={parseInt(index)}>{preset.name} ({preset.url})</option>
            {/each}
          </select>
        </div>
      {:else}
        <div class="space-y-4">
          <div>
            <label for="link-name" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Link Name
            </label>
            <input
              type="text"
              id="link-name"
              bind:value={editingLink.data.name}
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-l text-sm text-neutral-900 dark:text-neutral-100"
              placeholder="e.g. Projects"
            />
          </div>

          <div>
            <label for="link-url" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              URL
            </label>
            <input
              type="text"
              id="link-url"
              bind:value={editingLink.data.url}
              class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-l text-sm text-neutral-900 dark:text-neutral-100"
              placeholder="e.g. /projects/ or https://example.com"
            />
          </div>

          <div class="flex items-center">
            <input
              type="checkbox"
              id="link-external"
              bind:checked={editingLink.data.external}
              class="h-4 w-4 text-[var(--primary)] border-neutral-300 dark:border-neutral-600 rounded"
            />
            <label for="link-external" class="ml-2 block text-sm text-neutral-700 dark:text-neutral-300">
              External Link
            </label>
          </div>
        </div>
      {/if}

      <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          class="px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          on:click={onCancel}
        >
          Cancel
        </button>

        <button
          type="button"
          class="px-4 py-2 bg-[var(--primary)] hover:opacity-90 text-white font-medium rounded-md transition-opacity"
          on:click={() => onSave(editingLink)}
          disabled={editingLink.isPreset && editingLink.presetIndex === null}
        >
          {editingLink.isNew ? 'Add Link' : 'Save Changes'}
        </button>
      </div>
    </div>
  </div>
</div>
