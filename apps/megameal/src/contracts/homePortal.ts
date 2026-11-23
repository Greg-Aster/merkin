export const homePortalEvents = {
  portalAdvance: 'merkin:portal-advance',
  bannerSelectScene: 'merkin:banner-select-scene',
  portalIntroReady: 'megameal:portal-intro-ready',
  audioConfigChange: 'megameal:audio-config-change',
  audioSuspend: 'megameal:audio-suspend',
  audioResume: 'megameal:audio-resume',
} as const

export const homePortalWindowKeys = {
  portalDemoPlayerCleanup: '__megamealPortalDemoPlayerCleanup',
  portalDemoPlayerBound: '__megamealPortalDemoPlayerBound',
  portalSponsoredBloomCleanup: '__megamealPortalSponsoredBloomCleanup',
} as const

export const portalDemoStorageKeys = {
  lastIndex: 'megameal-portal-demo-last-index',
} as const

export const portalDemoState = {
  activeClass: 'megameal-portal-demo-active',
  audioSuspensionReason: 'portal-demo',
} as const

export type PortalAdvanceDetail = {
  direction?: number
  step?: number
}

export type PortalBannerSelectSceneDetail = {
  phase?: 'hold' | 'transition' | 'standard-banner'
  progress?: number
  sceneId?: string
  fromSceneId?: string
  toSceneId?: string
  fromScreenIndex?: number
  toScreenIndex?: number
  selectedIndex?: number
}

export type PortalIntroReadyDetail = {
  phase: 'logo-settled'
}

export type PortalAudioSuspensionDetail = {
  reason: typeof portalDemoState.audioSuspensionReason
}
