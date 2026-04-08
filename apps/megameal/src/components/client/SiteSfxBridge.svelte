<script lang="ts">
import { onMount } from 'svelte'
import { siteSfxManager, type SiteSfxId } from '../../utils/site-sfx'

const isNativeInteractive = (element: HTMLElement | null) =>
  !!element?.closest(
    'a[href], button, [role="button"], summary, .btn-card, .btn-plain, .btn-primary',
  )

function resolvePointerSfx(target: EventTarget | null): SiteSfxId | null {
  const element = target instanceof HTMLElement ? target : null
  if (!element) return null

  const explicitElement = element.closest<HTMLElement>('[data-sfx-click]')
  const explicit = explicitElement?.dataset.sfxClick as SiteSfxId | undefined
  if (explicit) return explicit

  if (element.closest('input[type="range"], audio, video')) {
    return null
  }

  if (element.closest('.product-card')) {
    return null
  }

  if (element.closest('#nav-menu-switch, #display-settings-switch')) {
    return 'panel-open'
  }

  if (element.closest('.site-audio-button')) {
    return 'panel-open'
  }

  if (element.closest('.site-audio-panel')) {
    return 'soft'
  }

  if (element.closest('.btn-quiz-option, .hero-cta-primary, .hero-cta-secondary, .hero-cta-ghost')) {
    return 'select'
  }

  if (element.closest('.banner-link[data-has-link="true"]')) {
    return 'sweep'
  }

  if (isNativeInteractive(element)) {
    return 'soft'
  }

  return 'soft'
}

onMount(() => {
  siteSfxManager.initialize()
  let lastScrollSfxAt = 0

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    if (event.pointerType === 'touch') return

    const sfxId = resolvePointerSfx(event.target)
    if (sfxId) {
      siteSfxManager.play(sfxId)
    }
  }

  const handleWheel = (event: WheelEvent) => {
    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    if (Math.abs(event.deltaY) < 14 && Math.abs(event.deltaX) < 14) return

    const now = window.performance.now()
    if (now - lastScrollSfxAt < 650) return

    lastScrollSfxAt = now
    siteSfxManager.play('scroll')
  }

  const handleCustomSfx = (event: Event) => {
    const customEvent = event as CustomEvent<{ id?: SiteSfxId }>
    const sfxId = customEvent.detail?.id
    if (sfxId) {
      siteSfxManager.play(sfxId)
    }
  }

  document.addEventListener('pointerdown', handlePointerDown, true)
  document.addEventListener('wheel', handleWheel, { passive: true })
  document.addEventListener('megameal:sfx', handleCustomSfx)

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown, true)
    document.removeEventListener('wheel', handleWheel)
    document.removeEventListener('megameal:sfx', handleCustomSfx)
  }
})
</script>
