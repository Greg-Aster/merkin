/**
 * Central Game State Store - Modern Threlte Implementation
 * Replaces the old event-bus-driven GameStateManager with reactive Svelte stores
 */

import { type Writable, derived, writable } from 'svelte/store'
import { DEFAULT_LEVEL_ID } from '../levels/levelRegistry'

// Core game state types
export interface PlayerState {
  position: [number, number, number]
  rotation: [number, number, number]
  health: number
  energy: number
  inventory: string[]
}

export interface GameSession {
  totalPlayTime: number
  timeExplored: number
  interactionsCount: number
  levelsVisited: string[]
}

export interface StarData {
  uniqueId: string
  title: string
  description: string
  slug: string
  timelineYear: number
  timelineEra: string
  timelineLocation: string
  isKeyEvent: boolean
  isLevel: boolean
  levelId?: string
  tags: string[]
  category: string
  unlocked: boolean
  screenPosition?: any
  // Visual properties for star rendering
  position: [number, number, number]
  color: string
  size: number
  intensity: number
  animationOffset: number
  twinkleSpeed: number
  era?: string
  clickable: boolean
  hoverable: boolean
}

// Core game state stores
export const currentLevelStore: Writable<string> = writable(DEFAULT_LEVEL_ID)
export const selectedStarStore: Writable<StarData | null> = writable(null)
export const playerStateStore: Writable<PlayerState> = writable({
  position: [0, 12, 10], // Spawn at center with reasonable height
  rotation: [0, 0, 0], // Keep rotation as is
  health: 100,
  energy: 100,
  inventory: [],
})

export const gameSessionStore: Writable<GameSession> = writable({
  totalPlayTime: 0,
  timeExplored: 0,
  interactionsCount: 0,
  levelsVisited: [DEFAULT_LEVEL_ID],
})

// UI state stores
export const isMobileStore: Writable<boolean> = writable(false)
export const errorStore: Writable<string | null> = writable(null)

// Dialogue state stores
export const dialogueStore = writable({
  visible: false,
  text: '',
  speaker: '',
  duration: 3000,
})

// Derived stores for computed values
export const gameStatsStore = derived(
  [gameSessionStore, playerStateStore],
  ([$session, $player]) => ({
    totalPlayTime: $session.totalPlayTime,
    timeExplored: $session.timeExplored,
    interactionsCount: $session.interactionsCount,
    levelsVisited: $session.levelsVisited,
    playerHealth: $player.health,
    playerEnergy: $player.energy,
    inventorySize: $player.inventory.length,
  }),
)

// Action creators for updating state
export const gameActions = {
  // Level management
  transitionToLevel: (levelId: string) => {
    currentLevelStore.set(levelId)
    gameSessionStore.update(session => ({
      ...session,
      levelsVisited: [...new Set([...session.levelsVisited, levelId])],
    }))
  },

  // Star selection
  selectStar: (star: StarData | null) => {
    selectedStarStore.set(star)
  },

  deselectStar: () => {
    selectedStarStore.set(null)
  },

  // Player state
  updatePlayerPosition: (position: [number, number, number]) => {
    playerStateStore.update(state => ({ ...state, position }))
  },

  updatePlayerRotation: (rotation: [number, number, number]) => {
    playerStateStore.update(state => ({ ...state, rotation }))
  },

  // Interactions
  recordInteraction: (type: string, objectId: string) => {
    gameSessionStore.update(session => ({
      ...session,
      interactionsCount: session.interactionsCount + 1,
    }))
  },

  // Dialogue
  showDialogue: (text: string, speaker: string, duration: number = 3000) => {
    dialogueStore.set({ visible: true, text, speaker, duration })
  },

  hideDialogue: () => {
    dialogueStore.update(state => ({ ...state, visible: false }))
  },

  // UI state
  setMobile: (isMobile: boolean) => {
    isMobileStore.set(isMobile)
  },

  setError: (error: string | null) => {
    errorStore.set(error)
  },
}

// Persistence helpers
export const saveGameState = () => {
  const state: {
    currentLevel: string
    selectedStar: StarData | null
    playerState: PlayerState | null
    gameSession: GameSession | null
  } = {
    currentLevel: '',
    selectedStar: null,
    playerState: null,
    gameSession: null,
  }

  // Subscribe once to get current values
  const unsubscribers = [
    currentLevelStore.subscribe(val => (state.currentLevel = val)),
    selectedStarStore.subscribe(val => (state.selectedStar = val)),
    playerStateStore.subscribe(val => (state.playerState = val)),
    gameSessionStore.subscribe(val => (state.gameSession = val)),
  ]

  // Unsubscribe immediately
  unsubscribers.forEach(unsub => unsub())

  try {
    localStorage.setItem('megameal-game-state', JSON.stringify(state))
    if (import.meta.env.DEV) console.log('💾 Game state saved')
  } catch (error) {
    console.warn('Failed to save game state:', error)
  }
}

export const loadGameState = () => {
  try {
    const saved = localStorage.getItem('megameal-game-state')
    if (saved) {
      const state = JSON.parse(saved)

      if (state.currentLevel) currentLevelStore.set(state.currentLevel)
      // Don't restore selectedStar - always start with none selected
      // if (state.selectedStar) selectedStarStore.set(state.selectedStar)
      if (state.playerState) playerStateStore.set(state.playerState)
      if (state.gameSession) gameSessionStore.set(state.gameSession)

      if (import.meta.env.DEV) console.log('📂 Game state loaded')
    }
  } catch (error) {
    console.warn('Failed to load game state:', error)
  }
}

if (typeof window !== 'undefined') {
  const persistenceKey = '__megamealGameStatePersistenceInstalled'
  const runtimeWindow = window as unknown as Window &
    Record<string, boolean | undefined>

  if (!runtimeWindow[persistenceKey]) {
    runtimeWindow[persistenceKey] = true

    window.addEventListener('pagehide', saveGameState)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        saveGameState()
      }
    })
  }
}
