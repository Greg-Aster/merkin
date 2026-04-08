import type {
  AudioSfxConfig,
  AudioStorageKeys,
  AudioSfxId,
  SiteAmbienceTrackId,
} from './audio-ids'

export interface SiteAudioTrackConfig {
  id: SiteAmbienceTrackId
  src: string
  label: string
  routes: string[]
  loop?: boolean
  volume?: number
  html5?: boolean
}

export interface SiteAudioConfig {
  enabledByDefault: boolean
  storageKey: string
  legacyVolumeStorageKey: string
  masterVolumeStorageKey: string
  ambienceVolumeStorageKey: string
  sfxVolumeStorageKey: string
  fadeDurationMs: number
  defaultMasterVolume: number
  defaultAmbienceVolume: number
  defaultSfxVolume: number
  tracks: SiteAudioTrackConfig[]
}

export const siteAudioStorageKeys: AudioStorageKeys = {
  enabled: 'megameal-site-audio-enabled',
  legacyVolume: 'megameal-site-audio-volume',
  masterVolume: 'megameal-site-audio-master-volume',
  ambienceVolume: 'megameal-site-audio-ambience-volume',
  sfxVolume: 'megameal-site-audio-sfx-volume',
}

export const siteAudioConfig: SiteAudioConfig = {
  enabledByDefault: false,
  storageKey: siteAudioStorageKeys.enabled,
  legacyVolumeStorageKey: siteAudioStorageKeys.legacyVolume,
  masterVolumeStorageKey: siteAudioStorageKeys.masterVolume,
  ambienceVolumeStorageKey: siteAudioStorageKeys.ambienceVolume,
  sfxVolumeStorageKey: siteAudioStorageKeys.sfxVolume,
  fadeDurationMs: 900,
  defaultMasterVolume: 1,
  defaultAmbienceVolume: 0.42,
  defaultSfxVolume: 0.48,
  tracks: [
    {
      id: 'portal-deck',
      src: '/audio/ambient/Wicked Shadows Whisper.mp3',
      label: 'Portal Deck',
      routes: ['/', '/community', '/friends'],
      volume: 0.92,
    },
    {
      id: 'timeline-drift',
      src: '/audio/ambient/Shadow Waltz.mp3',
      label: 'Timeline Drift',
      routes: ['/posts/timeline', '/posts/explainer', '/posts/timelines', '/archive'],
      volume: 0.86,
    },
    {
      id: 'commercial-hum',
      src: '/audio/ambient/Dark Shadows of Delight.mp3',
      label: 'Commercial Hum',
      routes: ['/store', '/store-placeholder', '/about'],
      volume: 0.8,
    },
    {
      id: 'playfloor-loop',
      src: '/audio/ambient/retro video game, new age, electric guitar fake.mp3',
      label: 'Playfloor Loop',
      routes: ['/game'],
      volume: 0.72,
    },
    {
      id: 'audit-quiz',
      src: '/audio/ambient/meta_3.mp3',
      label: 'Audit Quiz',
      routes: ['/quiz'],
      volume: 0.75,
    },
    {
      id: 'shadow-broadcast',
      src: '/audio/ambient/Untitled.mp3',
      label: 'Shadow Broadcast',
      routes: ['/posts'],
      volume: 0.72,
    },
  ],
}

export const siteSfxProfile: Record<AudioSfxId, AudioSfxConfig> = {
  select: {
    id: 'select',
    src: '/audio/sfx/select-click.mp3',
    volume: 0.6,
    preload: true,
  },
  soft: {
    id: 'soft',
    src: '/audio/sfx/interface-click-tone.mp3',
    volume: 0.42,
    preload: true,
  },
  'panel-open': {
    id: 'panel-open',
    src: '/audio/sfx/interface-open.mp3',
    volume: 0.5,
    preload: true,
  },
  'panel-back': {
    id: 'panel-back',
    src: '/audio/sfx/interface-back.mp3',
    volume: 0.46,
    preload: true,
  },
  error: {
    id: 'error',
    src: '/audio/sfx/interface-error.mp3',
    volume: 0.55,
    preload: true,
  },
  sweep: {
    id: 'sweep',
    src: '/audio/sfx/interface-sweep.mp3',
    volume: 0.34,
    rate: 0.96,
    rateJitter: 0.04,
    preload: true,
  },
  scroll: {
    id: 'scroll',
    src: '/audio/sfx/interface-sweep.mp3',
    volume: 0.18,
    rate: 0.82,
    rateJitter: 0.05,
    interrupt: false,
    preload: true,
  },
}

export function normalizeAudioPathname(pathname: string): string {
  if (!pathname) return '/'
  const normalized = pathname.replace(/\/+$/, '')
  return normalized.length > 0 ? normalized : '/'
}

export function getTrackForPathname(
  pathname: string,
): SiteAudioTrackConfig | null {
  const normalizedPath = normalizeAudioPathname(pathname)

  const matches = siteAudioConfig.tracks
    .filter(track =>
      track.routes.some(route => {
        const normalizedRoute = normalizeAudioPathname(route)
        return (
          normalizedPath === normalizedRoute ||
          normalizedPath.startsWith(`${normalizedRoute}/`)
        )
      }),
    )
    .sort((a, b) => {
      const aLength = Math.max(...a.routes.map(route => normalizeAudioPathname(route).length))
      const bLength = Math.max(...b.routes.map(route => normalizeAudioPathname(route).length))
      return bLength - aLength
    })

  return matches[0] ?? null
}
