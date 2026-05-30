<script lang="ts">
  import Icon from '@iconify/svelte/dist/Icon.svelte'

  export let title: string
  export let text: string
  export let url: string

  let copied = false

  $: encodedUrl = encodeURIComponent(url)
  $: encodedTitle = encodeURIComponent(title)
  $: encodedText = encodeURIComponent(text ? `${title} - ${text}` : title)
  $: emailBody = encodeURIComponent(`${text}\n\n${url}`)
  $: shareLinks = [
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: 'fa6-brands:facebook-f',
    },
    {
      label: 'X',
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      icon: 'fa6-brands:x-twitter',
    },
    {
      label: 'Bluesky',
      href: `https://bsky.app/intent/compose?text=${encodedText}%20${encodedUrl}`,
      icon: 'fa6-brands:bluesky',
    },
    {
      label: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
      icon: 'fa6-brands:reddit-alien',
    },
    {
      label: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${emailBody}`,
      icon: 'material-symbols:mail-outline-rounded',
    },
  ]

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      copied = true
      window.setTimeout(() => {
        copied = false
      }, 1800)
    } catch {
      copied = false
    }
  }

  async function shareNative() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    await copyLink()
  }
</script>

<div class="space-y-3" aria-label="Share this Merkin gallery entry">
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      class="btn-card inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-100 transition hover:bg-white/15 active:scale-95 sm:text-[0.8rem]"
      data-sfx-hover="hover-soft"
      data-sfx-click="soft"
      on:click={shareNative}
    >
      <Icon icon="material-symbols:ios-share-rounded" class="h-5 w-5" />
      Device Share
    </button>
    <button
      type="button"
      class="btn-card inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-100 transition hover:bg-white/15 active:scale-95 sm:text-[0.8rem]"
      data-sfx-hover="hover-soft"
      data-sfx-click="soft"
      on:click={shareNative}
    >
      <Icon icon="fa6-brands:instagram" class="h-5 w-5" />
      Instagram
    </button>
    <button
      type="button"
      class="btn-card inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-100 transition hover:bg-white/15 active:scale-95 sm:text-[0.8rem]"
      data-sfx-hover="hover-soft"
      data-sfx-click="soft"
      on:click={copyLink}
    >
      <Icon icon="material-symbols:content-copy-outline-rounded" class="h-5 w-5" />
      {copied ? 'Copied' : 'Copy Link'}
    </button>
  </div>
  <div class="flex flex-wrap gap-2">
    {#each shareLinks as link}
      <a
        href={link.href}
        class="btn-card inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-100 transition hover:bg-white/15 active:scale-95"
        data-sfx-hover="hover-soft"
        data-sfx-click="soft"
        target={link.href.startsWith('mailto:') ? undefined : '_blank'}
        rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
        aria-label={`Share on ${link.label}`}
        title={`Share on ${link.label}`}
      >
        <Icon icon={link.icon} class="h-5 w-5" />
      </a>
    {/each}
  </div>
  <p class="sr-only" aria-live="polite">{copied ? 'Link copied to clipboard.' : ''}</p>
</div>
