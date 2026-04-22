import type { Component } from 'svelte'
import type { Readable } from 'svelte/store'

export type BannerStageTransition = 'fade' | 'cut' | 'glitch'

export interface BannerStageCartItem {
  id: string
  name: string
  price?: number
  quantity?: number
  sku?: string
  [key: string]: unknown
}

export type BannerSceneEvent =
  | { type: 'add-to-cart'; item: BannerStageCartItem }
  | { type: 'navigate'; href: string }
  | { type: 'open-modal'; modalId: string }
  | { type: 'request-expand' | 'request-collapse' }
  | { type: 'scene-done' }

export interface BannerStageAudioBus {
  play?: (id: string, params?: Record<string, unknown>) => void
  stop?: (id: string) => void
  emit?: (event: string, detail?: Record<string, unknown>) => void
}

export interface BannerStageGlobalState {
  cart?: Readable<unknown>
  visitorId?: string | null
  [key: string]: unknown
}

export interface BannerStagePublicApi {
  currentSceneId: Readable<string | null>
  emit: (event: BannerSceneEvent) => void
  navigateToScene: (sceneId: string) => Promise<void>
}

export interface BannerStageContextValue {
  themeTokens: Record<string, string>
  audioBus: BannerStageAudioBus
  globalState: BannerStageGlobalState
  stage: BannerStagePublicApi
}

export interface SceneProps {
  sceneId: string
  pagePath: string
  payload: Record<string, unknown>
  themeTokens: Record<string, string>
  audioBus: BannerStageAudioBus
  globalState: BannerStageGlobalState
  emit: (event: BannerSceneEvent) => void
  requestSceneChange: (sceneId: string) => Promise<void>
}

export type BannerSceneComponent = Component<{ props: SceneProps }>

export interface SceneSelectionContext {
  pagePath: string
  now: Date
  cookie: string
}

export interface SceneDefinition {
  id: string
  title?: string
  weight?: number
  eligiblePages?: string[]
  minIntervalDays?: number
  transition?: BannerStageTransition
  sceneProps?: Record<string, unknown>
  load: () => Promise<{ default: BannerSceneComponent }>
}

export interface SceneHistoryEntry {
  sceneId: string
  shownAt: string
}
