<script lang="ts">
import type { Post } from '../utils/postUtils'

export let post: Post
export let insertTextAtCursor: (text: string, before: string, after: string, elementId: string) => string
export let wordCount = 0
export let readingTime = 0
export let lastSavedAt: Date | null = null
export let formatTime: (date: Date) => string
</script>

<div class="flex flex-wrap gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-t text-neutral-700 dark:text-neutral-300">
  <!-- Formatting buttons -->
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Heading 1 (Ctrl+Alt+1)" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '# ', '', 'content');
    }}>
    <span class="font-bold">H1</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Heading 2 (Ctrl+Alt+2)" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '## ', '', 'content');
    }}>
    <span class="font-bold">H2</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Heading 3 (Ctrl+Alt+3)" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '### ', '', 'content');
    }}>
    <span class="font-bold">H3</span>
  </button>
  
  <div class="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>
  
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Bold (Ctrl+B)" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '**', '**', 'content');
    }}>
    <span class="font-bold">B</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Italic (Ctrl+I)" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '_', '_', 'content');
    }}>
    <span class="italic">I</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Strikethrough" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '~~', '~~', 'content');
    }}>
    <span class="line-through">S</span>
  </button>
  
  <div class="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>
  
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Bullet List (Ctrl+Alt+L)" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '- ', '', 'content');
    }}>
    <span>• List</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Numbered List" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '1. ', '', 'content');
    }}>
    <span>1. List</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Task List" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '- [ ] ', '', 'content');
    }}>
    <span>☐ Task</span>
  </button>
  
  <div class="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>
  
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Link (Ctrl+K)" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '[', '](url)', 'content');
    }}>
    <span>🔗 Link</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Image" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '![alt text](', ')', 'content');
    }}>
    <span>🖼️ Image</span>
  </button>
  
  <div class="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>
  
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Code Block" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '```\n', '\n```', 'content');
    }}>
    <span>Code</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Inline Code" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '`', '`', 'content');
    }}>
    <span>{'`'}</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Table" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n', '', 'content');
    }}>
    <span>Table</span>
  </button>
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Quote" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '> ', '', 'content');
    }}>
    <span>Quote</span>
  </button>
  
  <div class="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>
  
  <button type="button" class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Horizontal Rule" 
    on:click={() => {
      post.content = insertTextAtCursor(post.content, '\n---\n', '', 'content');
    }}>
    <span>―</span>
  </button>
  
  <div class="flex-grow"></div>
  
  <div class="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
    <span>{wordCount} words</span>
    <span>~{readingTime} min read</span>
    {#if lastSavedAt}
      <span>Saved at {formatTime(lastSavedAt)}</span>
    {/if}
  </div>
</div>