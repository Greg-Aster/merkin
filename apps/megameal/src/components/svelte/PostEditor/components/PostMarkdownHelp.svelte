<script lang="ts">
export let onClose = () => {}
</script>

<div class="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md mb-4">
  <div class="flex justify-between items-start mb-2">
    <h3 class="font-medium text-neutral-900 dark:text-neutral-100">Markdown Cheat Sheet</h3>
    <button 
      type="button" 
      on:click={onClose}
      class="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      aria-label="Close markdown cheat sheet"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
    <div>
      <h4 class="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Text Formatting</h4>
      <div class="space-y-1 text-neutral-700 dark:text-neutral-300">
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded"># Heading 1</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">## Heading 2</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">### Heading 3</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">**Bold**</code> or <code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">__Bold__</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">*Italic*</code> or <code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">_Italic_</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">~~Strikethrough~~</code></div>
      </div>
    </div>
    
    <div>
      <h4 class="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Lists & Blocks</h4>
      <div class="space-y-1 text-neutral-700 dark:text-neutral-300">
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">- Item</code> or <code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">* Item</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">1. Item</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">> Blockquote</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">```<br>Code Block<br>```</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">`Inline Code`</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">---</code> (Horizontal rule)</div>
      </div>
    </div>
    
    <div>
      <h4 class="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Links & Media</h4>
      <div class="space-y-1 text-neutral-700 dark:text-neutral-300">
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">[Link Text](URL)</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">![Alt Text](Image URL)</code></div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">[Link Text][id]<br>[id]: URL "Title"</code></div>
        <div class="mt-2 font-semibold">Keyboard Shortcuts:</div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">Ctrl+B</code> Bold</div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">Ctrl+I</code> Italic</div>
        <div><code class="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">Ctrl+K</code> Link</div>
      </div>
    </div>
  </div>
</div>
