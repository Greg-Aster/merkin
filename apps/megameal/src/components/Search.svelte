<script lang="ts">
import I18nKey from '@i18n/i18nKey'
import { i18n } from '@i18n/translation'
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { url } from '@utils/url-utils'
import { onMount } from 'svelte'

type PagefindResult = {
  url: string
  meta: {
    title: string
  }
  excerpt: string
}

type PagefindApi = {
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
export let hideMobileTrigger = false

const fakeResult = [
  {
    url: url('/'),
    meta: {
      title: 'This Is a Fake Search Result',
    },
    excerpt:
      'Because the search cannot work in the <mark>dev</mark> environment.',
  },
  {
    url: url('/'),
    meta: {
      title: 'If You Want to Test the Search',
    },
    excerpt: 'Try running <mark>npm build && npm preview</mark> instead.',
  },
]

let search = (_keyword: string, _isDesktop: boolean) => {}

function waitForPagefind(timeoutMs = 2500) {
  if (window.pagefind) return Promise.resolve(window.pagefind)

  return new Promise<PagefindApi | null>(resolve => {
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('pagefind:ready', handleReady)
      resolve(window.pagefind ?? null)
    }, timeoutMs)

    function handleReady() {
      window.clearTimeout(timeoutId)
      resolve(window.pagefind ?? null)
    }

    window.addEventListener('pagefind:ready', handleReady, { once: true })
  })
}

onMount(() => {
  search = async (keyword: string, isDesktop: boolean) => {
    const panel = document.getElementById('search-panel')
    if (!panel) return

    if (!keyword && isDesktop) {
      panel.classList.add('float-panel-closed')
      return
    }

    let arr = []

    if (import.meta.env.PROD) {
      const pagefind = await waitForPagefind()
      if (!pagefind) return

      const ret = await pagefind.search(keyword)
      for (const item of ret.results) {
        const pagefindResult = await item.data()
        pagefindResult.excerpt = stripHtml(pagefindResult.excerpt || '')
        arr.push(pagefindResult)
      }
    } else {
      arr = fakeResult
    }

    if (!arr.length && isDesktop) {
      panel.classList.add('float-panel-closed')
      return
    }

    if (isDesktop) {
      panel.classList.remove('float-panel-closed')
    }
    result = arr
  }
})

// Strip markup from excerpts before rendering.
function stripHtml(text: string) {
  return String(text || '').replace(/<[^>]*>/g, '')
}

const togglePanel = () => {
  const panel = document.getElementById('search-panel')
  panel?.classList.toggle('float-panel-closed')
}

export function openSearchPanel() {
  const panel = document.getElementById('search-panel')
  panel?.classList.remove('float-panel-closed')

  requestAnimationFrame(() => {
    const mobileInput = document.querySelector<HTMLInputElement>(
      '#search-bar-inside input',
    )
    mobileInput?.focus()
  })
}

$: search(keywordDesktop, true)
$: search(keywordMobile, false)
</script>
  
  <!-- search bar for desktop view -->
  <div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
        bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
        dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
      <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
      <input placeholder="{i18n(I18nKey.search)}" aria-label={i18n(I18nKey.search)} bind:value={keywordDesktop} on:focus={() => search(keywordDesktop, true)} data-sfx-focus="focus-soft"
             class="transition-all pl-10 text-sm bg-transparent outline-0 focus:outline-0
           h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
      >
  </div>
  
  <!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label="Search Panel" id="search-switch" data-sfx-hover="hover-soft" data-sfx-click="panel-open"
          class:hidden={hideMobileTrigger}
          class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
      <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
  </button>
  
  <!-- search panel -->
  <div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
  top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">
  
      <!-- search bar inside panel for phone/tablet -->
      <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
        bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
        dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
    ">
          <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
          <input placeholder="Search" aria-label={i18n(I18nKey.search)} bind:value={keywordMobile} data-sfx-focus="focus-soft"
                 class="pl-10 absolute inset-0 text-sm bg-transparent outline-0 focus:outline-0
                  focus:w-60 text-black/50 dark:text-white/50"
          >
      </div>
  
      <!-- search results -->
      {#each result as item}
          <div
             class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
         rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
              <a href={item.url} class="block" data-sfx-hover="hover-soft" data-sfx-click="soft">
                <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
                    {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
                </div>
              </a>
              <div class="transition text-sm text-50">
                  {item.excerpt}
              </div>
          </div>
      {/each}
  </div>
  
