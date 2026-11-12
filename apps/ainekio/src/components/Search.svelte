<script lang="ts">
import I18nKey from '@i18n/i18nKey'
import { i18n } from '@i18n/translation'
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { url } from '@utils/url-utils'

type PagefindResult = {
  url: string
  meta: {
    title: string
  }
  excerpt: string
}

type PagefindApi = {
  options: (options: { excerptLength: number }) => Promise<void>
  init: () => Promise<void> | void
  search: (keyword: string) => Promise<{
    results: Array<{
      data: () => Promise<PagefindResult>
    }>
  }>
}

declare global {
  interface Window {
    pagefind?: PagefindApi
  }
}

let keywordDesktop = ''
let keywordMobile = ''
let result: PagefindResult[] = []
let searchError = ''
let pagefindLoadPromise: Promise<PagefindApi | null> | null = null
let searchRequestId = 0
export let hideMobileTrigger = false

const fakeResult: PagefindResult[] = [
  {
    url: url('/posts/project-overview/'),
    meta: {
      title: 'Ainekio Project Overview (Dev Preview)',
    },
    excerpt:
      'Pagefind search indexes built HTML during production builds (pnpm build).',
  },
]

async function loadPagefind() {
  if (!import.meta.env.PROD) return null
  if (window.pagefind) return window.pagefind

  if (!pagefindLoadPromise) {
    pagefindLoadPromise = (async () => {
      const scriptUrl = url('/pagefind/pagefind.js')
      const pagefind = (await import(
        /* @vite-ignore */ scriptUrl
      )) as PagefindApi
      await pagefind.options({ excerptLength: 20 })
      await pagefind.init()
      window.pagefind = pagefind
      return pagefind
    })().catch(error => {
      console.error('Search initialization failed:', error)
      searchError = 'Search is temporarily unavailable. Please try again.'
      pagefindLoadPromise = null
      return null
    })
  }

  return pagefindLoadPromise
}

async function search(keyword: string, isDesktop: boolean) {
  if (typeof document === 'undefined') return
  const panel = document.getElementById('search-panel')
  if (!panel) return

  const normalizedKeyword = keyword.trim()
  const requestId = ++searchRequestId
  if (!normalizedKeyword) {
    result = []
    searchError = ''
    if (isDesktop) panel.classList.add('float-panel-closed')
    return
  }

  let nextResults: PagefindResult[] = []
  searchError = ''

  if (import.meta.env.PROD) {
    const pagefind = await loadPagefind()
    if (!pagefind || requestId !== searchRequestId) return

    try {
      const response = await pagefind.search(normalizedKeyword)
      nextResults = await Promise.all(
        response.results.map(async item => {
          const pagefindResult = await item.data()
          pagefindResult.excerpt = stripHtml(pagefindResult.excerpt || '')
          return pagefindResult
        }),
      )
    } catch (error) {
      console.error('Search request failed:', error)
      searchError = 'Search could not be completed. Please try again.'
      return
    }
  } else {
    nextResults = fakeResult
  }

  if (requestId !== searchRequestId) return
  if (!nextResults.length && isDesktop) {
    panel.classList.add('float-panel-closed')
    return
  }

  if (isDesktop) panel.classList.remove('float-panel-closed')
  result = nextResults
}

function stripHtml(text: string) {
  return String(text || '').replace(/<[^>]*>/g, '')
}

const togglePanel = () => {
  const panel = document.getElementById('search-panel')
  const isOpening = panel?.classList.contains('float-panel-closed')
  panel?.classList.toggle('float-panel-closed')
  if (isOpening) void loadPagefind()
}

$: void search(keywordDesktop, true)
$: void search(keywordMobile, false)
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex relative transition-all items-center h-10 mr-1.5 rounded-lg
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/[0.06] dark:hover:bg-white/10 dark:focus-within:bg-white/10
      border border-transparent focus-within:border-[color-mix(in_srgb,var(--primary)_35%,transparent)]
">
    <Icon icon="material-symbols:search" class="absolute text-[1.15rem] pointer-events-none ml-2.5 transition my-auto text-black/40 dark:text-white/40"></Icon>
    <input placeholder={i18n(I18nKey.search)} aria-label={i18n(I18nKey.search)} bind:value={keywordDesktop} on:focus={() => void loadPagefind()}
           class="transition-all pl-8 pr-3 text-sm bg-transparent outline-0 focus:outline-0
         h-full w-36 xl:w-44 focus:w-56 text-black/80 dark:text-white/85 placeholder:text-black/40 dark:placeholder:text-white/40"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label="Search Panel" id="search-switch"
        class:hidden={hideMobileTrigger}
        class="btn-plain scale-animation lg:!hidden rounded-lg w-10 h-10 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute w-[min(25rem,calc(100vw-1rem))]
right-2 shadow-2xl rounded-xl p-2.5">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-10 rounded-lg
      bg-black/[0.05] dark:bg-white/[0.07] border border-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.15rem] pointer-events-none ml-3 transition my-auto text-black/40 dark:text-white/40"></Icon>
        <input placeholder="Search notes, pinouts, RL, Ainekio OS…" aria-label={i18n(I18nKey.search)} bind:value={keywordMobile} on:focus={() => void loadPagefind()}
               class="pl-9 pr-3 w-full h-full text-sm bg-transparent outline-0 focus:outline-0
               text-black/85 dark:text-white/85 placeholder:text-black/40 dark:placeholder:text-white/40"
        >
    </div>

    {#if !keywordMobile.trim() && !result.length && !searchError}
      <p class="lg:hidden px-2 pt-2 pb-0.5 text-xs text-black/50 dark:text-white/50">
        Type to search all 43 build notes, V2 wiring diagrams, and reference guides.
      </p>
    {/if}

    {#if searchError}
      <p role="status" class="px-2.5 py-2 text-sm text-[var(--primary)]">
        {searchError}
      </p>
    {/if}

    {#if keywordMobile.trim() && !result.length && !searchError}
      <p role="status" class="lg:hidden px-2.5 pt-2 pb-1 text-xs text-black/60 dark:text-white/60">
        No matching pages found for “{keywordMobile.trim()}”.
      </p>
    {/if}

    <!-- search results -->
    {#if result.length}
      <div class="max-h-[65vh] overflow-y-auto mt-1.5 lg:mt-0 space-y-0.5">
        {#each result as item}
          <a href={item.url}
             class="transition group block rounded-lg px-2.5 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
              <div class="transition text-90 text-sm inline-flex items-center gap-1 font-bold group-hover:text-[var(--primary)]">
                  <span>{item.meta.title}</span>
                  <Icon icon="fa6-solid:chevron-right" class="transition text-[0.65rem] shrink-0 text-[var(--primary)]"></Icon>
              </div>
              <div class="transition text-xs text-50 line-clamp-2 mt-0.5">
                  {item.excerpt}
              </div>
          </a>
        {/each}
      </div>
    {/if}
</div>

<style>
  input:focus {
    outline: 0;
  }
  #search-panel {
    top: calc(var(--navbar-height, 4.5rem) + 0.4rem);
    border: 1px solid color-mix(in srgb, var(--primary) 26%, transparent);
    background: color-mix(in srgb, var(--card-surface-bg, var(--card-bg)) 96%, #050b0e);
  }
</style>
