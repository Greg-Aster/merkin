import { type AudioSfxId, siteAudioConfig } from '../config/audio'
import type { SiteAudioState } from './site-audio'

export interface SiteAudioClientManager {
  subscribe(listener: (state: SiteAudioState) => void): () => void
  syncForPath(
    pathname: string,
    userInitiated?: boolean,
    options?: { forceRescore?: boolean },
  ): void
  unlockFromGesture(event?: Event): Promise<boolean>
  setEnabled(nextEnabled: boolean): void
  setMasterVolume(nextVolume: number): void
  setAmbienceVolume(nextVolume: number): void
  setSfxVolume(nextVolume: number): void
}

export interface SiteSfxClientManager {
  hasUnlockedAudio(): boolean
  play(id: AudioSfxId): void
  playIfUnlocked(id: AudioSfxId): void
}

type SiteAudioModule = { siteAudioManager: SiteAudioClientManager }
type SiteSfxModule = { siteSfxManager: SiteSfxClientManager }

export const siteAudioLoadFailedEvent = 'megameal:audio-load-failed'

export type SiteAudioLoadSurface = 'ambience' | 'sfx'

let siteAudioModulePromise: Promise<SiteAudioModule> | null = null
let siteSfxModulePromise: Promise<SiteSfxModule> | null = null
let loadedSiteAudioManager: SiteAudioClientManager | null = null
let loadedSiteSfxManager: SiteSfxClientManager | null = null

const reportLoadFailure = (surface: SiteAudioLoadSurface) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(siteAudioLoadFailedEvent, { detail: { surface } }),
  )
}

export function readStoredSiteAudioPreference(): boolean | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.localStorage.getItem(siteAudioConfig.storageKey)
    return stored === null ? null : stored === 'true'
  } catch {
    return null
  }
}

export function readSiteAudioEnabledPreference(): boolean {
  return readStoredSiteAudioPreference() ?? siteAudioConfig.enabledByDefault
}

export function getLoadedSiteAudioManager(): SiteAudioClientManager | null {
  return loadedSiteAudioManager
}

export function getLoadedSiteSfxManager(): SiteSfxClientManager | null {
  return loadedSiteSfxManager
}

export async function loadSiteAudioManager(): Promise<SiteAudioClientManager> {
  siteAudioModulePromise ??= import('./site-audio')
    .then(module => {
      const implementation =
        module.siteAudioManager as SiteAudioClientManager & {
          initialize(): void
        }
      implementation.initialize()
      loadedSiteAudioManager = module.siteAudioManager
      return module
    })
    .catch(error => {
      siteAudioModulePromise = null
      reportLoadFailure('ambience')
      throw error
    })
  const { siteAudioManager } = await siteAudioModulePromise
  return siteAudioManager
}

export async function loadSiteSfxManager(): Promise<SiteSfxClientManager> {
  siteSfxModulePromise ??= import('./site-sfx')
    .then(module => {
      const implementation = module.siteSfxManager as SiteSfxClientManager & {
        initialize(): void
      }
      implementation.initialize()
      loadedSiteSfxManager = module.siteSfxManager
      return module
    })
    .catch(error => {
      siteSfxModulePromise = null
      reportLoadFailure('sfx')
      throw error
    })
  const { siteSfxManager } = await siteSfxModulePromise
  return siteSfxManager
}
