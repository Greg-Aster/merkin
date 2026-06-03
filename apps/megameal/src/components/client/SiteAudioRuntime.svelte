<script lang="ts">
import { onMount } from 'svelte'
import { siteAudioManager } from '../../utils/site-audio'
import { addSiteAudioActivationListeners } from '../../utils/site-audio-activation'

let currentPathname = ''

const syncAudioForCurrentPage = (forceRescore: boolean) => {
  if (typeof window === 'undefined') return

  currentPathname = window.location.pathname
  siteAudioManager.syncForPath(currentPathname, false, { forceRescore })
}

onMount(() => {
  siteAudioManager.initialize()
  syncAudioForCurrentPage(false)

  const handlePageLoad = () => {
    if (typeof window === 'undefined') return

    const nextPathname = window.location.pathname
    const routeChanged = nextPathname !== currentPathname
    syncAudioForCurrentPage(routeChanged)
  }

  const stopListeningForAudioActivation = addSiteAudioActivationListeners(
    () => {
      void siteAudioManager.unlockFromGesture()
    },
  )

  document.addEventListener('astro:page-load', handlePageLoad)

  return () => {
    stopListeningForAudioActivation()
    document.removeEventListener('astro:page-load', handlePageLoad)
  }
})
</script>
