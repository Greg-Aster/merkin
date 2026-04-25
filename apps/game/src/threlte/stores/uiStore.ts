import { writable } from 'svelte/store'

export type RenderStylePresetChoice =
  | 'manifest'
  | 'site'
  | 'surreal-site'
  | 'ghibli'
  | 'alto'
  | 'monument'
  | 'etherpunk'
  | 'retro'

export type RenderLookMode = 'stylized' | 'beauty'

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

function createPersistentStringStore<T extends string>(
  key: string,
  initialValue: T,
  allowedValues?: readonly T[],
) {
  const store = writable<T>(initialValue)

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(key)
    if (stored !== null) {
      const nextValue = stored as T
      if (!allowedValues || allowedValues.includes(nextValue)) {
        store.set(nextValue)
      }
    }

    store.subscribe(value => {
      window.localStorage.setItem(key, value)
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

// Stylized rendering settings
export const renderStyleEnabled = createPersistentBooleanStore(
  'megameal-game-render-style-enabled',
  true,
)
export const renderLookMode = createPersistentStringStore<RenderLookMode>(
  'megameal-game-render-look-mode',
  'beauty',
  ['stylized', 'beauty'],
)
export const renderStylePresetChoice =
  createPersistentStringStore<RenderStylePresetChoice>(
    'megameal-game-render-style-preset-choice',
    'surreal-site',
    [
      'manifest',
      'site',
      'surreal-site',
      'ghibli',
      'alto',
      'monument',
      'etherpunk',
      'retro',
    ],
  )
export const renderStyleFlattenMaterials = createPersistentBooleanStore(
  'megameal-game-render-style-flatten-materials',
  false,
)
export const renderStylePaintedOutlines = createPersistentBooleanStore(
  'megameal-game-render-style-painted-outlines',
  true,
)
export const renderStyleOutlineThickness = createPersistentNumberStore(
  'megameal-game-render-style-outline-thickness',
  0.03,
  { min: 0.005, max: 0.08 },
)
export const renderStyleOutlineOpacity = createPersistentNumberStore(
  'megameal-game-render-style-outline-opacity',
  0.88,
  { min: 0.2, max: 1 },
)
