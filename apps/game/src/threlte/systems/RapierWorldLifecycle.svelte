<script lang="ts">
import { useRapier } from '@threlte/rapier'
import { onDestroy } from 'svelte'

export let paused = false

const rapier = useRapier()
let appliedPausedState: boolean | null = null

function applyPausedState() {
  if (appliedPausedState === paused) return
  appliedPausedState = paused

  if (paused) {
    rapier.pause()
    return
  }

  rapier.resume()
}

$: applyPausedState()

onDestroy(() => {
  rapier.pause()
})
</script>
