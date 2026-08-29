<script lang="ts">
  import { onMount } from 'svelte'
  import {
    fetchGoogleDocBlocks,
    renderInlineMarkdown,
    type GoogleDocBlock,
    type GoogleDocExportFormat,
  } from './google-docs'

  export let url: string
  export let format: GoogleDocExportFormat = 'txt'
  export let initialBlocks: GoogleDocBlock[] = []

  let blocks: GoogleDocBlock[] = initialBlocks
  let errorMessage = ''
  let isLoading = initialBlocks.length === 0
  let isShowingSnapshot = false

  onMount(() => {
    const abortController = new AbortController()

    async function loadDocument() {
      try {
        blocks = await fetchGoogleDocBlocks(url, format, {
          cacheBust: Date.now(),
          signal: abortController.signal,
        })
        isShowingSnapshot = false
      } catch (error) {
        if (abortController.signal.aborted) return
        if (blocks.length > 0) {
          isShowingSnapshot = true
        } else {
          errorMessage =
            error instanceof Error
              ? error.message
              : 'Docs Editor Bridge could not load this document.'
        }
      } finally {
        if (!abortController.signal.aborted) {
          isLoading = false
        }
      }
    }

    loadDocument()

    return () => abortController.abort()
  })
</script>

{#if isLoading}
  <p class="text-black/60 dark:text-white/60">Loading document...</p>
{:else if errorMessage}
  <p class="text-red-700 dark:text-red-300">{errorMessage}</p>
{:else}
  {#each blocks as block}
    {#if block.type === 'heading'}
      {#if block.depth === 1}
        <h1 id={block.id}>{block.text}</h1>
      {:else if block.depth === 2}
        <h2 id={block.id}>{block.text}</h2>
      {:else}
        <h3 id={block.id}>{block.text}</h3>
      {/if}
    {:else if block.type === 'paragraph'}
      <p>{@html renderInlineMarkdown(block.text)}</p>
    {:else if block.type === 'list'}
      <svelte:element this={block.ordered ? 'ol' : 'ul'}>
        {#each block.items as item}
          <li>{@html renderInlineMarkdown(item)}</li>
        {/each}
      </svelte:element>
    {:else if block.type === 'table'}
      <table class="docs-editor-table">
        <thead>
          <tr>
            {#each block.headers as header}
              <th>{@html renderInlineMarkdown(header)}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each block.rows as row}
            <tr>
              {#each row as cell, index}
                <td data-label={block.headers[index] ?? ''}>
                  {@html renderInlineMarkdown(cell)}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    {:else if block.type === 'pre'}
      <pre class="docs-editor-diagram"><code>{block.text}</code></pre>
    {:else if block.type === 'thematicBreak'}
      <hr />
    {/if}
  {/each}
{/if}

{#if isShowingSnapshot}
  <p
    class="text-sm text-amber-800 dark:text-amber-200"
    role="status"
    data-google-doc-status="snapshot"
  >
    Live update unavailable; showing the published snapshot.
  </p>
{/if}
