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
    'panel-open': {
      id: 'panel-open',
      src: '/audio/sfx/interface-open.mp3',
      volume: 0.45,
      preload: true,
    },
    'panel-back': {
      id: 'panel-back',
      src: '/audio/sfx/interface-back.mp3',
      volume: 0.3,
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
