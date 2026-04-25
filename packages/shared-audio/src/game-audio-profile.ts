import type {
  AudioSfxConfig,
  AudioSfxId,
  SiteAmbienceTrackId,
} from './audio-ids'

export interface GameAudioAmbienceConfig {
  id: SiteAmbienceTrackId
  src: string
  label: string
  volume: number
  loop?: boolean
  preload?: boolean
  html5?: boolean
}

export interface GameAudioProfile {
  ambience: GameAudioAmbienceConfig
  sfx: Record<AudioSfxId, AudioSfxConfig>
}

export const gameAudioProfile: GameAudioProfile = {
  ambience: {
    id: 'portal-deck',
    src: '/audio/ambient/portal-deck.mp3',
    label: 'Portal Deck',
    volume: 0.32,
    loop: true,
    preload: true,
    html5: true,
  },
  sfx: {
    select: {
      id: 'select',
      src: '/audio/sfx/select-click.mp3',
      volume: 0.5,
      preload: true,
    },
    soft: {
      id: 'soft',
      src: '/audio/sfx/interface-click-tone.mp3',
      volume: 0.22,
      preload: true,
    },
    'hover-soft': {
      id: 'hover-soft',
      src: '/audio/sfx/interface-click-tone.mp3',
      volume: 0.16,
      rate: 1.06,
      rateJitter: 0.03,
      cooldownMs: 110,
      interrupt: false,
      preload: true,
    },
    'hover-emphasis': {
      id: 'hover-emphasis',
      src: '/audio/sfx/interface-click-tone.mp3',
      volume: 0.2,
      rate: 0.96,
      rateJitter: 0.03,
      cooldownMs: 130,
      interrupt: false,
      preload: true,
    },
    'focus-soft': {
      id: 'focus-soft',
      src: '/audio/sfx/interface-click-tone.mp3',
      volume: 0.18,
      rate: 1,
      rateJitter: 0.02,
      cooldownMs: 140,
      interrupt: false,
      preload: true,
    },
    'panel-open': {
      id: 'panel-open',
      src: '/audio/sfx/interface-open.mp3',
      volume: 0.45,
      preload: true,
    },
    'panel-close': {
      id: 'panel-close',
      src: '/audio/sfx/interface-back.mp3',
      volume: 0.3,
      rate: 1.04,
      rateJitter: 0.03,
      preload: true,
    },
    'panel-back': {
      id: 'panel-back',
      src: '/audio/sfx/interface-back.mp3',
      volume: 0.3,
      preload: true,
    },
    confirm: {
      id: 'confirm',
      src: '/audio/sfx/select-click.mp3',
      volume: 0.42,
      rate: 0.92,
      rateJitter: 0.03,
      preload: true,
    },
    success: {
      id: 'success',
      src: '/audio/sfx/interface-open.mp3',
      volume: 0.46,
      rate: 1.08,
      rateJitter: 0.04,
      preload: true,
    },
    warning: {
      id: 'warning',
      src: '/audio/sfx/interface-back.mp3',
      volume: 0.26,
      rate: 0.88,
      rateJitter: 0.02,
      preload: true,
    },
    'cart-add': {
      id: 'cart-add',
      src: '/audio/sfx/select-click.mp3',
      volume: 0.46,
      rate: 0.9,
      rateJitter: 0.03,
      preload: true,
    },
    error: {
      id: 'error',
      src: '/audio/sfx/interface-back.mp3',
      volume: 0.34,
      preload: true,
    },
    sweep: {
      id: 'sweep',
      src: '/audio/sfx/interface-sweep.mp3',
      volume: 0.24,
      rate: 0.96,
      rateJitter: 0.04,
      preload: true,
    },
    scroll: {
      id: 'scroll',
      src: '/audio/sfx/interface-sweep.mp3',
      volume: 0.16,
      rate: 0.82,
      rateJitter: 0.04,
      interrupt: false,
      preload: true,
    },
  },
}
