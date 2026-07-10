<script lang="ts">
  import { onMount } from 'svelte'
  import {
    buildGoogleDocExportUrl,
    convertGoogleDocTextToBlocks,
    renderInlineMarkdown,
    type GoogleDocBlock,
    type GoogleDocExportFormat,
  } from './google-docs'

  export let url: string
  export let format: GoogleDocExportFormat = 'txt'

  let blocks: GoogleDocBlock[] = []
  let errorMessage = ''
  let isLoading = true

  onMount(() => {
    const abortController = new AbortController()

    async function loadDocument() {
      try {
        const exportUrl = buildGoogleDocExportUrl(url, format, Date.now())
        const response = await fetch(exportUrl, {
          signal: abortController.signal,
          cache: 'no-store',
          headers: {
            Accept: format === 'md' ? 'text/markdown,text/plain' : 'text/plain',
            'Cache-Control': 'no-cache',
          },
        })

        if (!response.ok) {
          throw new Error(`Google Docs export failed with ${response.status}.`)
        }

        const text = await response.text()
        blocks = convertGoogleDocTextToBlocks(text)
      } catch (error) {
        if (abortController.signal.aborted) return
        errorMessage =
          error instanceof Error
            ? error.message
            : 'Docs Editor Bridge could not load this document.'
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
