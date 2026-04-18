<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { useTask } from '@threlte/core'
  import * as howlerModule from 'howler'
  import { playerStateStore } from '../stores/gameStateStore'
  import { ambienceVolumeSetting, isSoundEnabled, masterVolumeSetting } from '../stores/uiStore'

  interface AmbientAudioRegion {
    id: string
    position: [number, number, number]
    scale: [number, number, number]
    track: string
    volume: number
    falloff: number
  }

  export let regions: AmbientAudioRegion[] = []
  export let enabled = true

  const howlerInteropCandidates = [
    howlerModule,
    (howlerModule as any).default,
    (globalThis as any).Howler
      ? { Howler: (globalThis as any).Howler, Howl: (globalThis as any).Howl }
      : null,
  ].filter(Boolean)

  const resolvedHowlerModule =
    howlerInteropCandidates.find((candidate: any) => candidate?.Howl || candidate?.Howler)
    ?? null

  const Howl = resolvedHowlerModule?.Howl
  const Howler = resolvedHowlerModule?.Howler
  type HowlInstance = InstanceType<NonNullable<typeof Howl>>

  let playerPosition: [number, number, number] = [0, 0, 0]
  let sounds = new Map<string, HowlInstance>()
  let hasUserUnlockedAudio = false

  const unsubscribePlayer = playerStateStore.subscribe((state) => {
    playerPosition = state.position
  })

  function disposeSound(regionId: string) {
    const sound = sounds.get(regionId)
    if (!sound) return
    sound.unload()
    sounds.delete(regionId)
  }

  function syncSoundsWithRegions(nextRegions: AmbientAudioRegion[]) {
    const activeRegionIds = new Set(nextRegions.map((region) => region.id))

    sounds.forEach((_sound, regionId) => {
      if (!activeRegionIds.has(regionId)) {
        disposeSound(regionId)
      }
    })

    nextRegions.forEach((region) => {
      const existing = sounds.get(region.id)
      const currentTrack = existing?.['_src']
      const normalizedTrack = Array.isArray(currentTrack) ? currentTrack[0] : currentTrack

      if (existing && normalizedTrack && normalizedTrack !== region.track) {
        disposeSound(region.id)
      }
    })
  }

  $: syncSoundsWithRegions(regions)

  function ensureSound(region: AmbientAudioRegion) {
    if (!Howl) return null
    const existing = sounds.get(region.id)
    if (existing) return existing

    const sound = new Howl({
      src: [region.track],
      volume: 0,
      loop: true,
      autoplay: false,
      preload: false,
      html5: true,
    })
    sounds.set(region.id, sound)
    return sound
  }

  function computeInfluence(region: AmbientAudioRegion) {
    const [px, py, pz] = playerPosition
    const [cx, cy, cz] = region.position
    const [sx, sy, sz] = region.scale.map((value) => Math.abs(value) / 2) as [number, number, number]
    const dx = Math.max(Math.abs(px - cx) - sx, 0)
    const dy = Math.max(Math.abs(py - cy) - sy, 0)
    const dz = Math.max(Math.abs(pz - cz) - sz, 0)
    const outsideDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (outsideDistance <= 0.0001) return 1
    if (outsideDistance >= region.falloff) return 0
    return 1 - outsideDistance / Math.max(0.001, region.falloff)
  }

  async function unlockAudioContext() {
    if (!Howler) return
    try {
      const ctx = Howler.ctx
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume()
      }
    } catch (error) {
      console.warn('Ambient region audio unlock failed:', error)
    }
  }

  function handleFirstInteraction() {
    hasUserUnlockedAudio = true
    void unlockAudioContext()
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', handleFirstInteraction, { capture: true, once: true, passive: true })
      window.addEventListener('touchstart', handleFirstInteraction, { capture: true, once: true, passive: true })
      window.addEventListener('keydown', handleFirstInteraction, { capture: true, once: true })
    }
  })

  useTask(() => {
    if (!enabled || !$isSoundEnabled || !hasUserUnlockedAudio) {
      sounds.forEach((sound) => {
        sound.volume(0)
        sound.pause()
      })
      return
    }

    regions.forEach((region) => {
      const sound = ensureSound(region)
      if (!sound) return

      const influence = computeInfluence(region)
      const targetVolume = $masterVolumeSetting * $ambienceVolumeSetting * region.volume * influence

      if (targetVolume > 0.002) {
        if (!sound.playing()) {
          sound.play()
        }
        sound.volume(targetVolume)
      } else {
        sound.volume(0)
        sound.pause()
      }
    })
  })

  onDestroy(() => {
    unsubscribePlayer()
    sounds.forEach((sound) => sound.unload())
    sounds.clear()
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', handleFirstInteraction, true)
      window.removeEventListener('touchstart', handleFirstInteraction, true)
      window.removeEventListener('keydown', handleFirstInteraction, true)
    }
  })
</script>
