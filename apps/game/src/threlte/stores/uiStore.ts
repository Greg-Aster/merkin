import { writable } from 'svelte/store'

const createUiStore = () => {
  const { subscribe, update } = writable({
    isInputFocused: false,
  })

  return {
    subscribe,
    setInputFocus: (isFocused: boolean) => {
      update(s => ({ ...s, isInputFocused: isFocused }))
    },
  }
}

export const uiStore = createUiStore()
export const setInputFocus = uiStore.setInputFocus
// Settings menu visibility
export const isSettingsMenuOpen = writable<boolean>(false)

function createPersistentBooleanStore(key: string, initialValue: boolean) {
  const store = writable(initialValue)

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(key)
    if (stored !== null) {
      store.set(stored === 'true')
    }

    store.subscribe(value => {
      window.localStorage.setItem(key, String(value))
    })
  }

  return store
}

function createPersistentNumberStore(
  key: string,
  initialValue: number,
  options?: {
    min?: number
    max?: number
  },
) {
  const store = writable(initialValue)
  const minValue = options?.min ?? Number.NEGATIVE_INFINITY
  const maxValue = options?.max ?? Number.POSITIVE_INFINITY

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(key)
    if (stored !== null) {
      const parsed = Number(stored)
      if (Number.isFinite(parsed)) {
        store.set(Math.min(maxValue, Math.max(minValue, parsed)))
      }
    }

    store.subscribe(value => {
      window.localStorage.setItem(key, String(value))
    })
  }

  return store
}

// Audio settings
export const isSoundEnabled = createPersistentBooleanStore(
  'megameal-game-audio-enabled',
  true,
)
export const masterVolumeSetting = createPersistentNumberStore(
  'megameal-game-master-volume',
  0.7,
  { min: 0, max: 1 },
)
export const ambienceVolumeSetting = createPersistentNumberStore(
  'megameal-game-ambience-volume',
  0.42,
  { min: 0, max: 1 },
)
export const sfxVolumeSetting = createPersistentNumberStore(
  'megameal-game-sfx-volume',
  0.48,
  { min: 0, max: 1 },
)
