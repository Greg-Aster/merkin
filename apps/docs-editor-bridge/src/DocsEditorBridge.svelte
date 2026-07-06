<script lang="ts">
  import { onMount } from 'svelte'
  import {
    buildGoogleDocTextExportUrl,
    convertGoogleDocTextToBlocks,
    type GoogleDocBlock,
  } from './google-docs'

  export let url: string

  let blocks: GoogleDocBlock[] = []
  let errorMessage = ''
  let isLoading = true

  onMount(() => {
    const abortController = new AbortController()

    async function loadDocument() {
      try {
        const exportUrl = buildGoogleDocTextExportUrl(url)
        const response = await fetch(exportUrl, {
          signal: abortController.signal,
          headers: {
            Accept: 'text/plain',
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
      <p>{block.text}</p>
    {:else}
      <ul>
        {#each block.items as item}
          <li>{item}</li>
        {/each}
      </ul>
    {/if}
  {/each}
{/if}
