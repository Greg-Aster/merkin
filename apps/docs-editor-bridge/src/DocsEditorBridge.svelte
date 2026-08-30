<script lang="ts">
  import { onMount } from 'svelte'
  import {
    fetchGoogleDocBlocks,
    getGoogleDocBlockPresentation,
    insertGoogleDocEditorialMedia,
    renderGoogleDocListHtml,
    renderInlineMarkdown,
    type GoogleDocBlock,
    type GoogleDocEditorialMedia,
    type GoogleDocExportFormat,
  } from './google-docs'

  export let url: string
  export let format: GoogleDocExportFormat = 'txt'
  export let initialBlocks: GoogleDocBlock[] = []
  export let editorialMedia: GoogleDocEditorialMedia[] = []

  let blocks: GoogleDocBlock[] = initialBlocks
  let errorMessage = ''
  let isLoading = initialBlocks.length === 0
  let isShowingSnapshot = false
  $: presentedBlocks = getGoogleDocBlockPresentation(
    insertGoogleDocEditorialMedia(blocks, editorialMedia),
  )

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
  {#each presentedBlocks as presentation}
    {@const block = presentation.block}
    {#if block.type === 'heading'}
      {#if block.depth === 1}
        <h1
          id={block.id}
          class="docs-editor-heading docs-editor-heading-1"
          data-doc-section={presentation.section}>{block.text}</h1
        >
      {:else if block.depth === 2}
        <h2
          id={block.id}
          class="docs-editor-heading docs-editor-heading-2 docs-editor-section-heading"
          data-doc-section={presentation.section}>{block.text}</h2
        >
      {:else}
        <h3
          id={block.id}
          class="docs-editor-heading docs-editor-heading-3"
          data-doc-section={presentation.section}>{block.text}</h3
        >
      {/if}
    {:else if block.type === 'paragraph'}
      <p
        class:docs-editor-section-lead={presentation.isSectionLead}
        class="docs-editor-paragraph"
        data-doc-section={presentation.section}
      >{@html renderInlineMarkdown(block.text)}</p>
    {:else if block.type === 'list'}
      {@html renderGoogleDocListHtml(block, presentation)}
    {:else if block.type === 'blockquote'}
      <blockquote
        class:docs-editor-section-lead={presentation.isSectionLead}
        class="docs-editor-quote"
        data-doc-section={presentation.section}
      >
        {#each block.paragraphs as paragraph}
          <p>{@html renderInlineMarkdown(paragraph)}</p>
        {/each}
      </blockquote>
    {:else if block.type === 'image'}
      <figure
        class:docs-editor-section-lead={presentation.isSectionLead}
        class="docs-editor-figure"
        data-doc-section={presentation.section}
        data-doc-media-layout={block.layout ?? 'inline'}
        data-doc-media-source={block.editorial ? 'editorial' : 'document'}
      >
        <img src={block.src} alt={block.alt} loading="lazy" decoding="async" />
        {#if block.caption}
          <figcaption>{@html renderInlineMarkdown(block.caption)}</figcaption>
        {/if}
      </figure>
    {:else if block.type === 'table'}
      <table class="docs-editor-table" data-doc-section={presentation.section}>
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
      <pre class="docs-editor-diagram" data-doc-section={presentation.section}
        ><code>{block.text}</code></pre
      >
    {:else if block.type === 'thematicBreak'}
      <hr class="docs-editor-rule" data-doc-section={presentation.section} />
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
