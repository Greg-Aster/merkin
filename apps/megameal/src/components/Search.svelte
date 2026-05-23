<script lang="ts">
import I18nKey from '@i18n/i18nKey'
import { i18n } from '@i18n/translation'
import Icon from '@iconify/svelte/dist/Icon.svelte'
import { url } from '@utils/url-utils'
import { onMount } from 'svelte'
import { getFriendContent, isFriendContentEnabled } from '../stores/friendStore'

type PagefindResult = {
  url: string
  meta: {
    title: string
  }
  excerpt: string
  isFriendContent?: boolean
  friendName?: string
  friendUrl?: string
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
let isAuthenticated = false
let friendContentEnabled = false
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
  function hasValidAuth() {
    const authed = localStorage.getItem('isAuthenticated') === 'true'
    const expiresAt = Number(localStorage.getItem('authExpiresAt') || '0')
    if (!authed || !expiresAt || Date.now() >= expiresAt) {
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('authExpiresAt')
      return false
    }
    return true
  }

  // Check authentication and friend content status
  isAuthenticated = hasValidAuth()
  friendContentEnabled = isFriendContentEnabled()

  search = async (keyword: string, isDesktop: boolean) => {
    const panel = document.getElementById('search-panel')
    if (!panel) return

    if (!keyword && isDesktop) {
      panel.classList.add('float-panel-closed')
      return
    }

    // Initialize results array
    let arr = []

    // Get standard search results
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
      // Mock data for non-production environment
      arr = fakeResult
    }

    // Get and add friend content results if enabled
    if (isAuthenticated && friendContentEnabled) {
      const friendResults = searchFriendPosts(keyword)

      // Convert friend results to the same format as pagefind results
      const formattedFriendResults = friendResults.map(post => ({
        url: post.sourceUrl || `/friend-${post.slug || post.id}`,
        meta: {
          title: `${post.title} (from ${post.friendName})`,
        },
        excerpt: stripHtml(post.description || ''),
        // Add indicator this is friend content
        isFriendContent: true,
        friendName: post.friendName,
        friendUrl: post.friendUrl,
      }))

      // Add friend results to the main results array
      arr = [...arr, ...formattedFriendResults]
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

  // Listen for friend content toggle events
  window.addEventListener('friend-content-toggled', e => {
    const event = e as CustomEvent
    const enabled = event.detail?.enabled ?? false

    if (friendContentEnabled !== enabled) {
      friendContentEnabled = enabled
      // Re-search with current keyword to update results
      search(keywordDesktop || keywordMobile, true)
    }
  })
})

// Function to search through friend posts
function searchFriendPosts(keyword) {
  if (!keyword) return []

  const friendPosts = getFriendContent()
  const normalizedKeyword = keyword.toLowerCase()

  return friendPosts.filter(post => {
    // Search in title
    if (post.title?.toLowerCase().includes(normalizedKeyword)) return true

    // Search in description
    if (post.description?.toLowerCase().includes(normalizedKeyword)) return true

    // Search in content (if available)
    if (post.content?.toLowerCase().includes(normalizedKeyword)) return true

    // Search in tags
    if (post.tags && Array.isArray(post.tags)) {
      if (post.tags.some(tag => tag.toLowerCase().includes(normalizedKeyword)))
        return true
    }

    // Search in category
    if (post.category?.toLowerCase().includes(normalizedKeyword)) return true

    return false
  })
}

// Strip markup from excerpts before rendering.
function stripHtml(text) {
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
         rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]
         {item.isFriendContent ? 'border-l-4 border-l-[var(--primary)]' : ''}">
              <a href={item.url} class="block" data-sfx-hover="hover-soft" data-sfx-click="soft">
                <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
                    {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
                </div>
              </a>
              {#if item.isFriendContent}
                  <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      From <a href={item.friendUrl} target="_blank" rel="noopener noreferrer" data-sfx-hover="hover-soft" data-sfx-click="sweep" class="text-[var(--primary)] hover:underline">{item.friendName}</a>
                  </div>
              {/if}
              <div class="transition text-sm text-50">
                  {item.excerpt}
              </div>
          </div>
      {/each}
  </div>
  
