<script lang="ts">
import { onMount } from 'svelte'
import { addSiteAudioActivationListeners } from '../../utils/site-audio-activation'
import {
  getLoadedSiteAudioManager,
  loadSiteAudioManager,
  readSiteAudioEnabledPreference,
} from '../../utils/site-audio-loader'

let currentPathname = ''

const syncAudioForCurrentPage = (forceRescore: boolean) => {
  if (typeof window === 'undefined') return

  currentPathname = window.location.pathname
  getLoadedSiteAudioManager()?.syncForPath(currentPathname, false, {
    forceRescore,
  })
}

onMount(() => {
  let mounted = true
  syncAudioForCurrentPage(false)
  void loadSiteAudioManager()
    .then(siteAudioManager => {
      if (!mounted) return
      siteAudioManager.syncForPath(window.location.pathname, false)
    })
    .catch(() => {
      // The loader reports the failure to the visible audio control.
    })

  const handlePageLoad = () => {
    if (typeof window === 'undefined') return

    const nextPathname = window.location.pathname
    const routeChanged = nextPathname !== currentPathname
    syncAudioForCurrentPage(routeChanged)
  }

  let stopListeningForAudioActivation = () => {}
  stopListeningForAudioActivation = addSiteAudioActivationListeners(event => {
    if (!readSiteAudioEnabledPreference()) return

    stopListeningForAudioActivation()
    void loadSiteAudioManager()
      .then(siteAudioManager => {
        siteAudioManager.syncForPath(window.location.pathname, false)
        return siteAudioManager.unlockFromGesture(event)
      })
      .catch(() => {
        // The loader reports the failure to the visible audio control.
      })
  })

  document.addEventListener('astro:page-load', handlePageLoad)

  return () => {
    mounted = false
    stopListeningForAudioActivation()
    document.removeEventListener('astro:page-load', handlePageLoad)
  }
})
</script>
