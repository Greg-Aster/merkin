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
  hashModulo?: number
  hashRemainder?: number
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
      src: '/audio/ambient/portal-deck.mp3',
      label: 'Portal Deck',
      routes: ['/'],
      volume: 0.9,
    },
    {
      id: 'community-signal',
      src: '/audio/ambient/Whistling Dreams.mp3',
      label: 'Whistling Dreams',
      routes: ['/community'],
      volume: 0.68,
    },
    {
      id: 'about-glow',
      src: '/audio/ambient/Untitled.mp3',
      label: 'Signal Bloom',
      routes: ['/about'],
      volume: 0.7,
    },
    {
      id: 'timeline-drift',
      src: '/audio/ambient/Shadow Waltz.mp3',
      label: 'Shadow Waltz',
      routes: [
        '/timeline',
        '/posts/timeline',
        '/posts/explainer',
        '/posts/timelines',
        '/archive',
      ],
      volume: 0.84,
    },
    {
      id: 'commercial-hum',
      src: '/audio/ambient/Dark Shadows of Delight.mp3',
      label: 'Dark Shadows of Delight',
      routes: ['/store', '/store-placeholder'],
      volume: 0.78,
    },
    {
      id: 'checkout-signal',
      src: '/audio/ambient/piano synth.mp3',
      label: 'Checkout Signal',
      routes: ['/store/checkout'],
      volume: 0.62,
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
      src: '/audio/ambient/Wicked Shadows Whisper.mp3',
      label: 'Wicked Shadows Whisper',
      routes: ['/posts'],
      volume: 0.7,
      hashModulo: 3,
      hashRemainder: 0,
    },
    {
      id: 'shadow-broadcast-alt',
      src: '/audio/ambient/Untitled.mp3',
      label: 'Archive Pulse',
      routes: ['/posts'],
      volume: 0.66,
      hashModulo: 3,
      hashRemainder: 1,
    },
    {
      id: 'shadow-broadcast-soft',
      src: '/audio/ambient/Whistling Dreams.mp3',
      label: 'Whistling Dreams',
      routes: ['/posts'],
      volume: 0.64,
      hashModulo: 3,
      hashRemainder: 2,
    },
    {
      id: 'quiet-gate',
      src: '/audio/ambient/Whistling Dreams.mp3',
      label: 'Quiet Gate',
      routes: ['/friends', '/login', '/privacy'],
      volume: 0.62,
    },
    {
      id: 'admin-grid',
      src: '/audio/ambient/piano synth.mp3',
      label: 'Piano Synth',
      routes: ['/host', '/new-post', '/configs'],
      volume: 0.66,
    },
    {
      id: 'lab-drive',
      src: '/audio/ambient/Faster.mp3',
      label: 'Faster',
      routes: ['/labs'],
      volume: 0.62,
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
  'hover-soft': {
    id: 'hover-soft',
    src: '/audio/sfx/interface-click-tone.mp3',
    volume: 0.24,
    rate: 1.06,
    rateJitter: 0.04,
    cooldownMs: 110,
    interrupt: false,
    preload: true,
  },
  'hover-emphasis': {
    id: 'hover-emphasis',
    src: '/audio/sfx/interface-click-tone.mp3',
    volume: 0.3,
    rate: 0.94,
    rateJitter: 0.03,
    cooldownMs: 130,
    interrupt: false,
    preload: true,
  },
  'focus-soft': {
    id: 'focus-soft',
    src: '/audio/sfx/interface-click-tone.mp3',
    volume: 0.26,
    rate: 0.98,
    rateJitter: 0.03,
    cooldownMs: 140,
    interrupt: false,
    preload: true,
  },
  'panel-open': {
    id: 'panel-open',
    src: '/audio/sfx/interface-open.mp3',
    volume: 0.5,
    preload: true,
  },
  'panel-close': {
    id: 'panel-close',
    src: '/audio/sfx/interface-back.mp3',
    volume: 0.42,
    rate: 1.05,
    rateJitter: 0.04,
    preload: true,
  },
  'panel-back': {
    id: 'panel-back',
    src: '/audio/sfx/interface-back.mp3',
    volume: 0.46,
    preload: true,
  },
  confirm: {
    id: 'confirm',
    src: '/audio/sfx/select-click.mp3',
    volume: 0.54,
    rate: 0.92,
    rateJitter: 0.03,
    preload: true,
  },
  success: {
    id: 'success',
    src: '/audio/sfx/interface-open.mp3',
    volume: 0.58,
    rate: 1.08,
    rateJitter: 0.04,
    preload: true,
  },
  warning: {
    id: 'warning',
    src: '/audio/sfx/interface-error.mp3',
    volume: 0.44,
    rate: 0.94,
    rateJitter: 0.02,
    preload: true,
  },
  'cart-add': {
    id: 'cart-add',
    src: '/audio/sfx/select-click.mp3',
    volume: 0.62,
    rate: 0.88,
    rateJitter: 0.03,
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
  'portal-awaken': {
    id: 'portal-awaken',
    src: '/audio/sfx/portal-awaken.mp3',
    volume: 0.5,
    rateJitter: 0.02,
    cooldownMs: 1200,
    interrupt: false,
    preload: true,
  },
  'portal-reveal': {
    id: 'portal-reveal',
    src: '/audio/sfx/portal-reveal.mp3',
    volume: 0.48,
    rateJitter: 0.02,
    cooldownMs: 900,
    interrupt: false,
    preload: true,
  },
  'portal-hover': {
    id: 'portal-hover',
    src: '/audio/sfx/portal-hover.mp3',
    volume: 0.28,
    rateJitter: 0.04,
    cooldownMs: 260,
    interrupt: false,
    preload: true,
  },
  'portal-drag': {
    id: 'portal-drag',
    src: '/audio/sfx/portal-drag.mp3',
    volume: 0.26,
    rate: 0.92,
    rateJitter: 0.025,
    cooldownMs: 700,
    interrupt: false,
    preload: true,
  },
  'portal-cycle': {
    id: 'portal-cycle',
    src: '/audio/sfx/portal-cycle.mp3',
    volume: 0.18,
    rate: 0.88,
    rateJitter: 0.025,
    cooldownMs: 520,
    interrupt: false,
    preload: true,
  },
  'portal-activate': {
    id: 'portal-activate',
    src: '/audio/sfx/portal-activate.mp3',
    volume: 0.58,
    rateJitter: 0.02,
    cooldownMs: 700,
    preload: true,
  },
}

export function normalizeAudioPathname(pathname: string): string {
  if (!pathname) return '/'
  const normalized = pathname.replace(/\/+$/, '')
  return normalized.length > 0 ? normalized : '/'
}

function getStablePathHash(pathname: string): number {
  let hash = 0
  for (let index = 0; index < pathname.length; index += 1) {
    hash = (hash * 31 + pathname.charCodeAt(index)) >>> 0
  }
  return hash
}

export function getTrackForPathname(
  pathname: string,
): SiteAudioTrackConfig | null {
  const normalizedPath = normalizeAudioPathname(pathname)
  const pathHash = getStablePathHash(normalizedPath)

  const matches = siteAudioConfig.tracks
    .flatMap(track =>
      track.routes.flatMap(route => {
        const normalizedRoute = normalizeAudioPathname(route)
        const routeMatches =
          normalizedPath === normalizedRoute ||
          normalizedPath.startsWith(`${normalizedRoute}/`)
        if (!routeMatches) return []

        if (
          typeof track.hashModulo === 'number' &&
          track.hashModulo > 0 &&
          typeof track.hashRemainder === 'number'
        ) {
          if (pathHash % track.hashModulo !== track.hashRemainder) {
            return []
          }
        }

        return [{ track, matchedRouteLength: normalizedRoute.length }]
      }),
    )
    .sort((a, b) => {
      return b.matchedRouteLength - a.matchedRouteLength
    })

  return matches[0]?.track ?? null
}
