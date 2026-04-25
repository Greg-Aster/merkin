import { solitudeAtmosphereProfileDefinitions } from '../styles/GameplayStyleProfiles'
import { mergeLevelSettings } from './editorLevelSetup'
import type {
  EditorAtmospherePresetId,
  EditorAudioPresetId,
  ObservatoryEditorSettings,
  SharedLevelAmbientAudioSettings,
  SharedLevelEditorSettings,
  SolitudeEditorSettings,
} from './editorTypes'

export interface LevelAtmospherePresetDefinition {
  id: EditorAtmospherePresetId
  label: string
  description: string
  settings: SharedLevelEditorSettings
}

export interface LevelAudioPresetDefinition {
  id: EditorAudioPresetId
  label: string
  description: string
  settings: SharedLevelAmbientAudioSettings
}

export interface ObservatoryAtmospherePresetDefinition {
  id: EditorAtmospherePresetId
  label: string
  description: string
  settings: ObservatoryEditorSettings
}

export const solitudeAtmospherePresets: LevelAtmospherePresetDefinition[] =
  solitudeAtmosphereProfileDefinitions.map(profile => ({
    id: profile.id,
    label: profile.label,
    description: profile.description,
    settings: profile.settings,
  }))

export const solitudeAudioPresets: LevelAudioPresetDefinition[] = [
  {
    id: 'lonely-wind',
    label: 'Lonely Wind',
    description: 'A wide, restless wind bed across the full plain.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Wicked Shadows Whisper.mp3',
        volume: 0.2,
        falloff: 36,
        position: [0, 8, 0],
        scale: [1500, 120, 1500],
      },
    },
  },
  {
    id: 'silent-basin',
    label: 'Silent Basin',
    description: 'Subtle low ambience that leaves space for local moments.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/meta_3.mp3',
        volume: 0.16,
        falloff: 30,
        position: [0, 6, 0],
        scale: [1320, 90, 1320],
      },
    },
  },
  {
    id: 'cold-starlight',
    label: 'Cold Starlight',
    description: 'Clear, suspended ambience with a colder melodic edge.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Shadow Waltz.mp3',
        volume: 0.14,
        falloff: 34,
        position: [0, 10, 0],
        scale: [1450, 140, 1450],
      },
    },
  },
  {
    id: 'wind-signals',
    label: 'Wind Signals',
    description: 'A lighter high-air loop for calmer exploration routes.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Whistling Dreams.mp3',
        volume: 0.14,
        falloff: 34,
        position: [0, 12, 0],
        scale: [1480, 150, 1480],
      },
    },
  },
  {
    id: 'archive-pulse',
    label: 'Archive Pulse',
    description: 'A softer synthetic bed for less severe ruin passes.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Untitled.mp3',
        volume: 0.15,
        falloff: 32,
        position: [0, 10, 0],
        scale: [1360, 130, 1360],
      },
    },
  },
  {
    id: 'shadow-waltz',
    label: 'Shadow Waltz',
    description: 'A more musical mood bed for dramatic ruin passes.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Shadow Waltz.mp3',
        volume: 0.2,
        falloff: 26,
        position: [0, 7, 0],
        scale: [980, 90, 980],
      },
    },
  },
  {
    id: 'ruin-whispers',
    label: 'Ruin Whispers',
    description: 'Darker ambience with more pressure around the ring.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Dark Shadows of Delight.mp3',
        volume: 0.18,
        falloff: 24,
        position: [0, 6, 0],
        scale: [1120, 80, 1120],
      },
    },
  },
]

export const observatoryAtmospherePresets: ObservatoryAtmospherePresetDefinition[] =
  [
    {
      id: 'sunlit-garden',
      label: 'Sunlit Garden',
      description:
        'Warm arrival light, colorful vegetation, and clear coastal air.',
      settings: {
        style: {
          preset: 'ghibli',
          enabled: true,
          fog: {
            color: '#87CEEB',
            density: 0.002,
          },
          colorGrading: {
            saturation: 1.2,
            contrast: 1.1,
            brightness: 1,
            warmth: 1.05,
          },
          bloom: {
            intensity: 0.3,
            threshold: 0.9,
          },
        },
        lighting: {
          ambientIntensity: 10.4,
          sunIntensity: 0.8,
          fillIntensity: 0.3,
          fallbackAmbientIntensity: 4.8,
          fallbackMoonlightIntensity: 0.45,
          fallbackFillLightIntensity: 0.2,
        },
        features: {
          ocean: true,
          vegetation: true,
          fireflies: true,
          starMap: true,
          conversations: true,
          styles: true,
        },
        ocean: {
          size: {
            width: 4000,
            height: 4000,
          },
          enableRising: true,
          initialLevel: -2,
          targetLevel: 5,
          riseRate: 0.01,
          enableAnimation: true,
          underwaterFogDensity: 0.1,
          underwaterFogColor: 533536,
          surfaceFogDensity: 0.001,
        },
      },
    },
    {
      id: 'storm-glass',
      label: 'Storm Glass',
      description: 'Cooler fog, sharper contrast, and a darker sea mood.',
      settings: {
        style: {
          preset: 'alto',
          enabled: true,
          fog: {
            color: '#708da8',
            density: 0.0032,
          },
          colorGrading: {
            saturation: 1.02,
            contrast: 1.16,
            brightness: 0.94,
            warmth: 0.9,
          },
          bloom: {
            intensity: 0.18,
            threshold: 0.95,
          },
        },
        lighting: {
          ambientIntensity: 8.8,
          sunIntensity: 0.56,
          fillIntensity: 0.24,
          fallbackAmbientIntensity: 4.2,
          fallbackMoonlightIntensity: 0.42,
          fallbackFillLightIntensity: 0.18,
        },
        ocean: {
          size: {
            width: 4200,
            height: 4200,
          },
          enableRising: true,
          initialLevel: -2.3,
          targetLevel: 4.5,
          riseRate: 0.012,
          enableAnimation: true,
          underwaterFogDensity: 0.12,
          underwaterFogColor: 401492,
          surfaceFogDensity: 0.0014,
        },
      },
    },
    {
      id: 'moon-archive',
      label: 'Moon Archive',
      description:
        'Dimmer library-like light for a more nocturnal observatory pass.',
      settings: {
        style: {
          preset: 'monument',
          enabled: true,
          fog: {
            color: '#596784',
            density: 0.00075,
          },
          colorGrading: {
            saturation: 0.96,
            contrast: 1.08,
            brightness: 0.91,
            warmth: 0.88,
          },
          bloom: {
            intensity: 0.18,
            threshold: 0.9,
          },
        },
        lighting: {
          ambientIntensity: 7.2,
          sunIntensity: 0.42,
          fillIntensity: 0.26,
          fallbackAmbientIntensity: 4,
          fallbackMoonlightIntensity: 0.62,
          fallbackFillLightIntensity: 0.24,
        },
        features: {
          ocean: true,
          vegetation: true,
          fireflies: true,
          starMap: true,
          conversations: true,
          styles: true,
        },
      },
    },
    {
      id: 'high-tide',
      label: 'High Tide',
      description:
        'Brighter water presence and a more reflective shoreline mood.',
      settings: {
        style: {
          preset: 'ghibli',
          enabled: true,
          fog: {
            color: '#8fc7df',
            density: 0.0016,
          },
        },
        lighting: {
          ambientIntensity: 10.8,
          sunIntensity: 0.86,
          fillIntensity: 0.34,
          fallbackAmbientIntensity: 5,
          fallbackMoonlightIntensity: 0.48,
          fallbackFillLightIntensity: 0.22,
        },
        ocean: {
          size: {
            width: 4400,
            height: 4400,
          },
          enableRising: true,
          initialLevel: -1.2,
          targetLevel: 6.4,
          riseRate: 0.013,
          enableAnimation: true,
          underwaterFogDensity: 0.11,
          underwaterFogColor: 665052,
          surfaceFogDensity: 0.0012,
        },
      },
    },
    {
      id: 'luminous-courtyard',
      label: 'Luminous Courtyard',
      description:
        'Softer bloom and gentler color for a serene arrival palette.',
      settings: {
        style: {
          preset: 'alto',
          enabled: true,
          fog: {
            color: '#9ed8d9',
            density: 0.0015,
          },
          colorGrading: {
            saturation: 1.08,
            contrast: 1.04,
            brightness: 1.02,
            warmth: 1.02,
          },
          bloom: {
            intensity: 0.36,
            threshold: 0.84,
          },
        },
        lighting: {
          ambientIntensity: 11.1,
          sunIntensity: 0.78,
          fillIntensity: 0.36,
          fallbackAmbientIntensity: 5.1,
          fallbackMoonlightIntensity: 0.5,
          fallbackFillLightIntensity: 0.24,
        },
      },
    },
  ]

export const observatoryAudioPresets: LevelAudioPresetDefinition[] = [
  {
    id: 'courtyard-breeze',
    label: 'Courtyard Breeze',
    description:
      'Light open-air ambience across the arrival and courtyard spaces.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/portal-deck.mp3',
        volume: 0.16,
        falloff: 28,
        position: [0, 18, 0],
        scale: [520, 140, 520],
      },
    },
  },
  {
    id: 'glass-horizon',
    label: 'Glass Horizon',
    description: 'A clear melodic bed suited to star-facing routes.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Shadow Waltz.mp3',
        volume: 0.12,
        falloff: 24,
        position: [0, 22, 0],
        scale: [460, 160, 460],
      },
    },
  },
  {
    id: 'quiet-tide',
    label: 'Quiet Tide',
    description: 'A restrained ambient wash that leaves room for local detail.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/meta_3.mp3',
        volume: 0.14,
        falloff: 24,
        position: [0, 16, 0],
        scale: [420, 120, 420],
      },
    },
  },
  {
    id: 'glass-signal',
    label: 'Glass Signal',
    description: 'A softer synthetic bed for calmer observatory passes.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Untitled.mp3',
        volume: 0.13,
        falloff: 24,
        position: [0, 20, 0],
        scale: [450, 140, 450],
      },
    },
  },
  {
    id: 'signal-bloom',
    label: 'Signal Bloom',
    description:
      'A brighter synthetic ambience for the observatory’s active systems.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Untitled.mp3',
        volume: 0.15,
        falloff: 22,
        position: [0, 20, 0],
        scale: [430, 130, 430],
      },
    },
  },
  {
    id: 'control-room',
    label: 'Control Room',
    description:
      'A restrained synth layer suited to terminals and utility spaces.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/piano synth.mp3',
        volume: 0.12,
        falloff: 20,
        position: [0, 18, 0],
        scale: [380, 120, 380],
      },
    },
  },
  {
    id: 'cathedral-deck',
    label: 'Cathedral Deck',
    description: 'A wider deck-like ambience for grand scenic passes.',
    settings: {
      ambientAudio: {
        enabled: true,
        track: '/audio/ambient/Wicked Shadows Whisper.mp3',
        volume: 0.14,
        falloff: 30,
        position: [0, 24, 0],
        scale: [580, 180, 580],
      },
    },
  },
]

const solitudeAtmospherePresetMap = new Map(
  solitudeAtmospherePresets.map(preset => [preset.id, preset]),
)

const solitudeAudioPresetMap = new Map(
  solitudeAudioPresets.map(preset => [preset.id, preset]),
)

const observatoryAtmospherePresetMap = new Map(
  observatoryAtmospherePresets.map(preset => [preset.id, preset]),
)

const observatoryAudioPresetMap = new Map(
  observatoryAudioPresets.map(preset => [preset.id, preset]),
)

export function resolveObservatoryPresetSettings(
  settings: ObservatoryEditorSettings | null | undefined,
): ObservatoryEditorSettings | null {
  if (!settings) return null

  const atmospherePreset = settings.presets?.atmosphere
    ? observatoryAtmospherePresetMap.get(settings.presets.atmosphere)
    : null
  const audioPreset = settings.presets?.audio
    ? observatoryAudioPresetMap.get(settings.presets.audio)
    : null

  return mergeLevelSettings<ObservatoryEditorSettings>(
    atmospherePreset?.settings,
    audioPreset?.settings,
    settings,
  )
}

export function resolveSolitudePresetSettings(
  settings: SolitudeEditorSettings | null | undefined,
): SolitudeEditorSettings | null {
  if (!settings) return null

  const atmospherePreset = settings.presets?.atmosphere
    ? solitudeAtmospherePresetMap.get(settings.presets.atmosphere)
    : null
  const audioPreset = settings.presets?.audio
    ? solitudeAudioPresetMap.get(settings.presets.audio)
    : null

  return mergeLevelSettings<SolitudeEditorSettings>(
    atmospherePreset?.settings,
    audioPreset?.settings,
    settings,
  )
}
