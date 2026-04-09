<!-- PageAnimations.svelte -->
<script lang="ts">
import { onMount } from 'svelte'

let animationTimeouts: number[] = []

onMount(() => {
  const handlePageLoad = () => {
    replayPageAnimations()
  }

  replayPageAnimations()
  document.addEventListener('astro:page-load', handlePageLoad)

  return () => {
    document.removeEventListener('astro:page-load', handlePageLoad)
    clearAnimationQueue()
  }
})

function replayPageAnimations() {
  clearAnimationQueue()
  resetOnloadAnimations()

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initializeOnloadAnimations()
      initializePostImageAnimation()

      scheduleTimeout(() => {
        initializeOnloadAnimations()
        initializePostImageAnimation()
      }, 450)
    })
  })
}

function clearAnimationQueue() {
  animationTimeouts.forEach((timeoutId) => {
    window.clearTimeout(timeoutId)
  })
  animationTimeouts = []
}

function scheduleTimeout(callback: () => void, delay: number) {
  const timeoutId = window.setTimeout(() => {
    animationTimeouts = animationTimeouts.filter((id) => id !== timeoutId)
    callback()
  }, delay)

  animationTimeouts.push(timeoutId)
}

function resetOnloadAnimations() {
  const elements = document.querySelectorAll<HTMLElement>('.onload-animation')
  elements.forEach((element) => {
    element.classList.remove('loaded')
  })
}

function initializeOnloadAnimations() {
  const elements =
    document.querySelectorAll<HTMLElement>('.onload-animation:not(.loaded)')

  elements.forEach((element, index) => {
    scheduleTimeout(() => {
      element.classList.add('loaded')
    }, 100 + index * 50)
  })
}

function initializePostImageAnimation() {
  const postImage = document.getElementById('post-image')
  if (postImage) {
    scheduleTimeout(() => {
      postImage.classList.remove('opacity-0', 'scale-105')
    }, 100)
  }
}
</script>

<!-- This component handles animations but doesn't render anything -->
<div style="display: none;"></div>
