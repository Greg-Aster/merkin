<script lang="ts">
export let editingEra: any
export let onCancel: () => void
export let onSave: () => void
</script>

<div class="fixed inset-0 bg-black/50 dark:bg-black/60 z-50 flex items-center justify-center">
  <div class="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full p-6 shadow-lg">
    <h3 class="text-lg font-semibold text-black/80 dark:text-white/80 mb-4">
      {editingEra.isNew ? 'Add Era' : 'Edit Era'}
    </h3>

    <div class="mb-4">
      <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Era Name
      </div>
      <input
        type="text"
        bind:value={editingEra.data.name}
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
        placeholder="e.g., past, present, future"
      />
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Start Year
        </div>
        <input
          type="number"
          bind:value={editingEra.data.startYear}
          min="1900"
          max="2100"
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
        />
      </div>

      <div>
        <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          End Year
        </div>
        <input
          type="number"
          bind:value={editingEra.data.endYear}
          min="1900"
          max="2100"
          class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
        />
      </div>
    </div>

    <div class="mb-4">
      <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Color
      </div>
      <div class="flex items-center space-x-3">
        <input
          type="color"
          bind:value={editingEra.data.color}
          class="h-10 w-10 border-0 rounded p-0"
        />
        <input
          type="text"
          bind:value={editingEra.data.color}
          class="flex-1 px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm"
          placeholder="#3b82f6"
        />
      </div>
    </div>

    <div class="mb-6">
      <div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Description
      </div>
      <textarea
        bind:value={editingEra.data.description}
        rows="3"
        class="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm text-neutral-800 dark:text-neutral-200"
        placeholder="A short description of this era"
      ></textarea>
    </div>

    <div class="flex justify-end space-x-3">
      <button
        class="py-2 px-4 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 font-medium rounded-md transition-colors"
        on:click={onCancel}
      >
        Cancel
      </button>

      <button
        class="py-2 px-4 bg-[var(--primary)] hover:opacity-90 text-white font-medium rounded-md transition-opacity flex items-center"
        on:click={onSave}
      >
        {editingEra.isNew ? 'Add Era' : 'Save Changes'}
      </button>
    </div>
  </div>
</div>
