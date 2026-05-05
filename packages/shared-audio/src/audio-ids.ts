export const SITE_AMBIENCE_TRACK_IDS = [
  'portal-deck',
  'community-signal',
  'timeline-drift',
  'commercial-hum',
  'checkout-signal',
  'playfloor-loop',
  'audit-quiz',
  'shadow-broadcast',
  'shadow-broadcast-alt',
  'shadow-broadcast-soft',
  'about-glow',
  'quiet-gate',
  'admin-grid',
  'lab-drive',
] as const

export type SiteAmbienceTrackId = (typeof SITE_AMBIENCE_TRACK_IDS)[number]

export const AUDIO_SFX_IDS = [
  'select',
  'soft',
  'hover-soft',
  'hover-emphasis',
  'focus-soft',
  'panel-open',
  'panel-close',
  'panel-back',
  'confirm',
  'success',
  'warning',
  'cart-add',
  'error',
  'sweep',
  'scroll',
  'portal-awaken',
  'portal-reveal',
  'portal-hover',
  'portal-drag',
  'portal-cycle',
  'portal-activate',
] as const

export type AudioSfxId = (typeof AUDIO_SFX_IDS)[number]

export interface AudioSfxConfig<TId extends AudioSfxId = AudioSfxId> {
  id: TId
  src: string
  volume: number
  rate?: number
  rateJitter?: number
  cooldownMs?: number
  interrupt?: boolean
  preload?: boolean
  html5?: boolean
}

export interface AudioStorageKeys {
  enabled: string
  legacyVolume: string
  masterVolume: string
  ambienceVolume: string
  sfxVolume: string
}
