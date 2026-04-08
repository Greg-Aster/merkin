export const SITE_AMBIENCE_TRACK_IDS = [
  'portal-deck',
  'timeline-drift',
  'commercial-hum',
  'playfloor-loop',
  'audit-quiz',
  'shadow-broadcast',
] as const

export type SiteAmbienceTrackId = (typeof SITE_AMBIENCE_TRACK_IDS)[number]

export const AUDIO_SFX_IDS = [
  'select',
  'soft',
  'panel-open',
  'panel-back',
  'error',
  'sweep',
  'scroll',
] as const

export type AudioSfxId = (typeof AUDIO_SFX_IDS)[number]

export interface AudioSfxConfig<TId extends AudioSfxId = AudioSfxId> {
  id: TId
  src: string
  volume: number
  rate?: number
  rateJitter?: number
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
