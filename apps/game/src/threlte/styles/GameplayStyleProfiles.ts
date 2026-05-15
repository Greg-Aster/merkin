import {
  type BuildRuntimeAtmosphereOptions,
  buildRuntimeAtmosphereFromLevelSettings,
  runtimeAtmosphereToRuntimeVisualStylePatch,
  runtimeVisualStyleToRuntimeAtmosphere,
} from '../atmosphere/buildRuntimeAtmosphere'
import type { SharedLevelEditorSettings } from '../engine/sceneDocumentTypes'
import type { StylePreset } from './StylePalettes'
import {
  DEFAULT_RUNTIME_VISUAL_STYLE,
  type RuntimeVisualStylePatch,
  type RuntimeVisualStyleSettings,
  mergeRuntimeVisualStyle,
} from './runtimeVisualStyleStore'

export type SolitudeAtmosphereProfileId =
  | 'lonely-wind'
  | 'ruin-haze'
  | 'heavy-ash'
  | 'silent-basin'
  | 'cold-starlight'
  | 'violet-dread'
  | 'signal-reef'
  | 'orchid-void'

export interface SolitudeLightingProfile {
  ambientColor: string
  hemisphereSkyColor: string
  hemisphereGroundColor: string
  keyColor: string
  fillColor: string
  keyPosition: [number, number, number]
  fillPosition: [number, number, number]
}

export interface SolitudeAtmosphereProfileDefinition {
  id: SolitudeAtmosphereProfileId
  label: string
  description: string
  stylePreset: StylePreset
  settings: SharedLevelEditorSettings
  runtime: RuntimeVisualStylePatch
  lighting: SolitudeLightingProfile
}

const surrealSiteBaseRuntime: RuntimeVisualStylePatch = {
  id: 'surreal-site',
  palettePreset: 'surreal-site',
  toneMappingExposure: 0.98,
  colorGrading: {
    saturation: 1.18,
    contrast: 1.12,
    brightness: 0.92,
    warmth: 0.9,
  },
  screenFx: {
    vignetteStrength: 0.46,
    grainOpacity: 0.06,
    accentGlowIntensity: 0.22,
    accentGlowColor: '#48d7ff',
    secondaryAccentGlowColor: '#ff4bd8',
    bloomIntensity: 0.22,
    bloomThreshold: 0.84,
  },
  heightFog: {
    color: '#22174f',
    density: 0.00034,
    floor: 0.25,
    ceiling: 11,
    colorInfluence: 0.48,
    mistOpacity: 0.18,
    mistLayers: 4,
    mistHeight: 0.55,
    mistSpacing: 0.46,
    mistScale: 380,
    mistDriftSpeed: 0.055,
  },
  terrain: {
    baseColor: '#070c1c',
    midColor: '#101d42',
    peakColor: '#2a2b7c',
    ridgeColor: '#57dfff',
    shadowColor: '#020309',
    normalStrength: 0.76,
    roughness: 0.94,
    envMapIntensity: 0.52,
    bumpScale: 0.035,
  },
  particles: {
    distribution: 'ground',
    blendMode: 'additive',
    groundBandStrength: 0.72,
    sizeMultiplier: 1,
    opacityMultiplier: 1,
  },
}

export const DEFAULT_SOLITUDE_ATMOSPHERE_PRESET: SolitudeAtmosphereProfileId =
  'violet-dread'

export const solitudeAtmosphereProfileDefinitions: SolitudeAtmosphereProfileDefinition[] =
  [
    {
      id: 'violet-dread',
      label: 'Violet Dread',
      description:
        'A hyper-saturated abyss of cyan signal-light and purple ruin haze.',
      stylePreset: 'surreal-site',
      settings: {
        style: {
          preset: 'surreal-site',
          enabled: true,
          fog: {
            color: '#43206c',
            density: 0.00092,
          },
          colorGrading: {
            saturation: 1.24,
            contrast: 1.18,
            brightness: 0.87,
            warmth: 0.86,
          },
          bloom: {
            intensity: 0.24,
            threshold: 0.84,
          },
        },
        lighting: {
          ambientIntensity: 0.46,
          keyLightIntensity: 0.96,
          fillLightIntensity: 0.34,
        },
        ambientParticles: {
          enabled: true,
          count: 220,
          radius: 132,
          minHeight: 0.35,
          maxHeight: 9.5,
          color: '#58e6ff',
          secondaryColor: '#ff4cd0',
          size: 1.22,
          opacity: 0.22,
          driftSpeed: 0.14,
          sway: 0.62,
        },
        water: {
          enabled: false,
        },
      },
      runtime: {
        id: 'violet-dread',
        toneMappingExposure: 0.96,
        screenFx: {
          vignetteStrength: 0.56,
          grainOpacity: 0.08,
          accentGlowIntensity: 0.27,
          accentGlowColor: '#59e5ff',
          secondaryAccentGlowColor: '#ff46ce',
          bloomIntensity: 0.24,
          bloomThreshold: 0.83,
        },
        heightFog: {
          color: '#231150',
          density: 0.00062,
          floor: 0.2,
          ceiling: 9,
          colorInfluence: 0.62,
          mistOpacity: 0.22,
          mistLayers: 5,
          mistHeight: 0.55,
          mistSpacing: 0.42,
          mistScale: 460,
          mistDriftSpeed: 0.065,
        },
        terrain: {
          baseColor: '#050915',
          midColor: '#111d44',
          peakColor: '#352e84',
          ridgeColor: '#3fcbff',
          shadowColor: '#010207',
          normalStrength: 0.92,
          roughness: 0.96,
          envMapIntensity: 0.56,
          bumpScale: 0.028,
        },
        particles: {
          distribution: 'ground',
          blendMode: 'additive',
          groundBandStrength: 0.82,
          sizeMultiplier: 1.05,
          opacityMultiplier: 1,
        },
      },
      lighting: {
        ambientColor: '#6b5bff',
        hemisphereSkyColor: '#7dbbff',
        hemisphereGroundColor: '#090512',
        keyColor: '#52d8ff',
        fillColor: '#7d31ff',
        keyPosition: [62, 96, 38],
        fillPosition: [-50, 34, -54],
      },
    },
    {
      id: 'signal-reef',
      label: 'Signal Reef',
      description:
        'Dark flooded ruins lit by cyan reefs and magenta signal bleed.',
      stylePreset: 'surreal-site',
      settings: {
        style: {
          preset: 'surreal-site',
          enabled: true,
          fog: {
            color: '#203b67',
            density: 0.0008,
          },
          colorGrading: {
            saturation: 1.2,
            contrast: 1.14,
            brightness: 0.9,
            warmth: 0.9,
          },
          bloom: {
            intensity: 0.16,
            threshold: 0.88,
          },
        },
        lighting: {
          ambientIntensity: 0.5,
          keyLightIntensity: 0.88,
          fillLightIntensity: 0.28,
        },
        water: {
          enabled: true,
          level: -0.18,
          size: {
            width: 920,
            height: 920,
          },
          color: '#182f63',
          opacity: 0.9,
          enableAnimation: true,
        },
        ambientParticles: {
          enabled: true,
          count: 170,
          radius: 138,
          minHeight: 0.2,
          maxHeight: 8,
          color: '#63f4ff',
          secondaryColor: '#c24cff',
          size: 1.14,
          opacity: 0.18,
          driftSpeed: 0.12,
          sway: 0.44,
        },
      },
      runtime: {
        id: 'signal-reef',
        toneMappingExposure: 0.98,
        screenFx: {
          vignetteStrength: 0.44,
          grainOpacity: 0.06,
          accentGlowIntensity: 0.2,
          accentGlowColor: '#59efff',
          secondaryAccentGlowColor: '#d44dff',
          bloomIntensity: 0.17,
          bloomThreshold: 0.88,
        },
        heightFog: {
          color: '#123053',
          density: 0.00042,
          floor: 0.15,
          ceiling: 9,
          colorInfluence: 0.5,
          mistOpacity: 0.16,
          mistLayers: 3,
          mistHeight: 0.48,
          mistSpacing: 0.42,
          mistScale: 400,
          mistDriftSpeed: 0.045,
        },
        terrain: {
          baseColor: '#040a18',
          midColor: '#123060',
          peakColor: '#1f5ba0',
          ridgeColor: '#58f2ff',
          shadowColor: '#020308',
          normalStrength: 0.84,
          roughness: 0.94,
          envMapIntensity: 0.62,
          bumpScale: 0.03,
        },
        particles: {
          distribution: 'ground',
          blendMode: 'additive',
          groundBandStrength: 0.76,
          sizeMultiplier: 0.96,
          opacityMultiplier: 0.9,
        },
      },
      lighting: {
        ambientColor: '#4d76ff',
        hemisphereSkyColor: '#86ebff',
        hemisphereGroundColor: '#07101f',
        keyColor: '#5ae7ff',
        fillColor: '#a13dff',
        keyPosition: [64, 88, 30],
        fillPosition: [-48, 30, -42],
      },
    },
    {
      id: 'orchid-void',
      label: 'Orchid Void',
      description:
        'A darker surreal bloom where pink-violet anomalies pulse through the night.',
      stylePreset: 'surreal-site',
      settings: {
        style: {
          preset: 'surreal-site',
          enabled: true,
          fog: {
            color: '#511f73',
            density: 0.00105,
          },
          colorGrading: {
            saturation: 1.3,
            contrast: 1.2,
            brightness: 0.84,
            warmth: 0.92,
          },
          bloom: {
            intensity: 0.22,
            threshold: 0.84,
          },
        },
        lighting: {
          ambientIntensity: 0.42,
          keyLightIntensity: 0.92,
          fillLightIntensity: 0.38,
        },
        ambientParticles: {
          enabled: true,
          count: 240,
          radius: 126,
          minHeight: 0.2,
          maxHeight: 10,
          color: '#7ad7ff',
          secondaryColor: '#ff5ec5',
          size: 1.28,
          opacity: 0.24,
          driftSpeed: 0.17,
          sway: 0.78,
        },
        water: {
          enabled: false,
        },
      },
      runtime: {
        id: 'orchid-void',
        toneMappingExposure: 0.94,
        screenFx: {
          vignetteStrength: 0.56,
          grainOpacity: 0.08,
          accentGlowIntensity: 0.25,
          accentGlowColor: '#80dcff',
          secondaryAccentGlowColor: '#ff5acb',
          bloomIntensity: 0.22,
          bloomThreshold: 0.84,
        },
        heightFog: {
          color: '#2b0f46',
          density: 0.00058,
          floor: 0.2,
          ceiling: 11,
          colorInfluence: 0.58,
          mistOpacity: 0.2,
          mistLayers: 4,
          mistHeight: 0.52,
          mistSpacing: 0.4,
          mistScale: 440,
          mistDriftSpeed: 0.055,
        },
        terrain: {
          baseColor: '#050714',
          midColor: '#1c1340',
          peakColor: '#4a237d',
          ridgeColor: '#65dfff',
          shadowColor: '#010207',
          normalStrength: 0.88,
          roughness: 0.95,
          envMapIntensity: 0.58,
          bumpScale: 0.028,
        },
        particles: {
          distribution: 'ground',
          blendMode: 'additive',
          groundBandStrength: 0.8,
          sizeMultiplier: 1.08,
          opacityMultiplier: 1.05,
        },
      },
      lighting: {
        ambientColor: '#8a5cff',
        hemisphereSkyColor: '#86b8ff',
        hemisphereGroundColor: '#090513',
        keyColor: '#83c2ff',
        fillColor: '#ff56cf',
        keyPosition: [58, 92, 34],
        fillPosition: [-44, 32, -48],
      },
    },
    {
      id: 'lonely-wind',
      label: 'Lonely Wind',
      description: 'Cold ruin air with sparse drifting motes and open sky.',
      stylePreset: 'site',
      settings: {
        style: {
          preset: 'site',
          enabled: true,
          fog: {
            color: '#4f6188',
            density: 0.00052,
          },
        },
        lighting: {
          ambientIntensity: 0.68,
          keyLightIntensity: 0.72,
          fillLightIntensity: 0.24,
        },
        ambientParticles: {
          enabled: true,
          count: 140,
          radius: 140,
          minHeight: 0.8,
          maxHeight: 18,
          color: '#8fd8ff',
          secondaryColor: '#f3e8b2',
          size: 1.05,
          opacity: 0.18,
          driftSpeed: 0.18,
          sway: 0.7,
        },
      },
      runtime: {
        id: 'lonely-wind',
      },
      lighting: {
        ambientColor: '#7d8fb9',
        hemisphereSkyColor: '#c2ddff',
        hemisphereGroundColor: '#101722',
        keyColor: '#93c5ff',
        fillColor: '#34456d',
        keyPosition: [70, 110, 32],
        fillPosition: [-60, 36, -48],
      },
    },
    {
      id: 'ruin-haze',
      label: 'Ruin Haze',
      description: 'Denser fog and warmer dust around the stone ring.',
      stylePreset: 'site',
      settings: {
        style: {
          preset: 'site',
          enabled: true,
          fog: {
            color: '#566786',
            density: 0.00082,
          },
        },
        lighting: {
          ambientIntensity: 0.62,
          keyLightIntensity: 0.64,
          fillLightIntensity: 0.2,
        },
        ambientParticles: {
          enabled: true,
          count: 200,
          radius: 120,
          minHeight: 0.5,
          maxHeight: 16,
          color: '#d3d4dd',
          secondaryColor: '#cda978',
          size: 1.18,
          opacity: 0.22,
          driftSpeed: 0.12,
          sway: 0.4,
        },
      },
      runtime: {
        id: 'ruin-haze',
        screenFx: {
          vignetteStrength: 0.36,
          grainOpacity: 0.05,
        },
      },
      lighting: {
        ambientColor: '#8ea2c8',
        hemisphereSkyColor: '#cfe2ff',
        hemisphereGroundColor: '#15161d',
        keyColor: '#b5ccff',
        fillColor: '#5b4d68',
        keyPosition: [70, 110, 32],
        fillPosition: [-60, 36, -48],
      },
    },
    {
      id: 'heavy-ash',
      label: 'Heavy Ash',
      description: 'Low visibility, darker light, and thick ash drifting low.',
      stylePreset: 'monument',
      settings: {
        style: {
          preset: 'monument',
          enabled: true,
          fog: {
            color: '#3c4558',
            density: 0.0011,
          },
        },
        lighting: {
          ambientIntensity: 0.46,
          keyLightIntensity: 0.52,
          fillLightIntensity: 0.14,
        },
        ambientParticles: {
          enabled: true,
          count: 300,
          radius: 112,
          minHeight: 0.2,
          maxHeight: 11,
          color: '#acb0b8',
          secondaryColor: '#71615e',
          size: 1.32,
          opacity: 0.34,
          driftSpeed: 0.08,
          sway: 0.24,
        },
      },
      runtime: {
        id: 'heavy-ash',
        screenFx: {
          vignetteStrength: 0.44,
          grainOpacity: 0.09,
        },
        particles: {
          distribution: 'ground',
          blendMode: 'normal',
          groundBandStrength: 0.88,
          sizeMultiplier: 1.1,
          opacityMultiplier: 1.1,
        },
      },
      lighting: {
        ambientColor: '#6c7583',
        hemisphereSkyColor: '#909cb2',
        hemisphereGroundColor: '#110f12',
        keyColor: '#9fb3c7',
        fillColor: '#4f5567',
        keyPosition: [68, 104, 28],
        fillPosition: [-54, 30, -46],
      },
    },
    {
      id: 'silent-basin',
      label: 'Silent Basin',
      description:
        'Calmer air and reflective water pooling under softer light.',
      stylePreset: 'site',
      settings: {
        style: {
          preset: 'site',
          enabled: true,
          fog: {
            color: '#41628c',
            density: 0.00034,
          },
        },
        lighting: {
          ambientIntensity: 0.74,
          keyLightIntensity: 0.6,
          fillLightIntensity: 0.28,
        },
        water: {
          enabled: true,
          level: -0.2,
          size: {
            width: 950,
            height: 950,
          },
          color: '#2a4770',
          opacity: 0.9,
          enableAnimation: true,
        },
        ambientParticles: {
          enabled: true,
          count: 90,
          radius: 130,
          minHeight: 0.4,
          maxHeight: 9,
          color: '#bfdfff',
          secondaryColor: '#d7f0ff',
          size: 0.95,
          opacity: 0.12,
          driftSpeed: 0.06,
          sway: 0.22,
        },
      },
      runtime: {
        id: 'silent-basin',
        terrain: {
          envMapIntensity: 0.5,
        },
      },
      lighting: {
        ambientColor: '#7da0d0',
        hemisphereSkyColor: '#cfe6ff',
        hemisphereGroundColor: '#0d1520',
        keyColor: '#a9ccff',
        fillColor: '#3b577c',
        keyPosition: [72, 108, 24],
        fillPosition: [-56, 34, -40],
      },
    },
    {
      id: 'cold-starlight',
      label: 'Cold Starlight',
      description: 'Sharper blue light and bright star-swept particles.',
      stylePreset: 'site',
      settings: {
        style: {
          preset: 'site',
          enabled: true,
          fog: {
            color: '#567bb1',
            density: 0.00024,
          },
        },
        lighting: {
          ambientIntensity: 0.56,
          keyLightIntensity: 0.94,
          fillLightIntensity: 0.3,
        },
        ambientParticles: {
          enabled: true,
          count: 160,
          radius: 150,
          minHeight: 1.2,
          maxHeight: 24,
          color: '#d9ecff',
          secondaryColor: '#92c0ff',
          size: 1.05,
          opacity: 0.22,
          driftSpeed: 0.18,
          sway: 1.08,
        },
      },
      runtime: {
        id: 'cold-starlight',
        screenFx: {
          accentGlowIntensity: 0.14,
          accentGlowColor: '#8ed7ff',
          secondaryAccentGlowColor: '#bca2ff',
        },
      },
      lighting: {
        ambientColor: '#88a7ff',
        hemisphereSkyColor: '#d6ecff',
        hemisphereGroundColor: '#0a1020',
        keyColor: '#9fdcff',
        fillColor: '#5467a8',
        keyPosition: [74, 114, 36],
        fillPosition: [-58, 30, -54],
      },
    },
  ]

const solitudeAtmosphereProfileMap = new Map(
  solitudeAtmosphereProfileDefinitions.map(profile => [profile.id, profile]),
)

function buildSolitudeRuntimeVisualStyleBase(
  profile: SolitudeAtmosphereProfileDefinition,
) {
  const base = mergeRuntimeVisualStyle(
    DEFAULT_RUNTIME_VISUAL_STYLE,
    surrealSiteBaseRuntime,
  )

  return mergeRuntimeVisualStyle(base, {
    palettePreset: profile.stylePreset,
    ...profile.runtime,
  })
}

export function findSolitudeAtmosphereProfile(
  id: string | null | undefined,
): SolitudeAtmosphereProfileDefinition | null {
  return (
    solitudeAtmosphereProfileMap.get(id as SolitudeAtmosphereProfileId) ?? null
  )
}

export function getSolitudeAtmosphereProfile(
  id: string | null | undefined,
): SolitudeAtmosphereProfileDefinition {
  return (
    solitudeAtmosphereProfileMap.get(id as SolitudeAtmosphereProfileId) ??
    solitudeAtmosphereProfileMap.get(DEFAULT_SOLITUDE_ATMOSPHERE_PRESET)!
  )
}

export function buildSolitudeRuntimeVisualStyle(
  settings: SharedLevelEditorSettings | null | undefined,
): RuntimeVisualStyleSettings {
  const profile = getSolitudeAtmosphereProfile(settings?.presets?.atmosphere)
  const withProfile = buildSolitudeRuntimeVisualStyleBase(profile)

  const stylePreset = settings?.style?.preset ?? profile.stylePreset
  const atmosphere = buildRuntimeAtmosphereFromLevelSettings(settings, {
    base: runtimeVisualStyleToRuntimeAtmosphere(withProfile, {
      id: profile.id,
      profileId: profile.id,
    }),
    profileId: profile.id,
  })

  const runtime = mergeRuntimeVisualStyle(withProfile, {
    id: profile.id,
    palettePreset: stylePreset,
    ...runtimeAtmosphereToRuntimeVisualStylePatch(atmosphere),
  })

  return runtime
}

export function buildRuntimeAtmosphereFromGameplayStyleSettings(
  settings: SharedLevelEditorSettings | null | undefined,
  options: BuildRuntimeAtmosphereOptions = {},
) {
  const profile = findSolitudeAtmosphereProfile(settings?.presets?.atmosphere)

  if (profile) {
    const withProfile = buildSolitudeRuntimeVisualStyleBase(profile)

    return buildRuntimeAtmosphereFromLevelSettings(settings, {
      ...options,
      profileId: profile.id,
      base: runtimeVisualStyleToRuntimeAtmosphere(withProfile, {
        id: profile.id,
        levelId: options.levelId,
        refreshKey: options.refreshKey,
        source: options.source,
        profileId: profile.id,
      }),
    })
  }

  const stylePreset =
    settings?.style?.preset ?? DEFAULT_RUNTIME_VISUAL_STYLE.palettePreset
  const base =
    stylePreset === 'surreal-site'
      ? mergeRuntimeVisualStyle(
          DEFAULT_RUNTIME_VISUAL_STYLE,
          surrealSiteBaseRuntime,
        )
      : DEFAULT_RUNTIME_VISUAL_STYLE

  return buildRuntimeAtmosphereFromLevelSettings(settings, {
    ...options,
    base: runtimeVisualStyleToRuntimeAtmosphere(base, {
      id:
        typeof settings?.presets?.atmosphere === 'string' &&
        settings.presets.atmosphere
          ? settings.presets.atmosphere
          : `level-${stylePreset}`,
      levelId: options.levelId,
      refreshKey: options.refreshKey,
      source: options.source,
    }),
  })
}

export function buildRuntimeVisualStyleFromLevelSettings(
  settings: SharedLevelEditorSettings | null | undefined,
): RuntimeVisualStyleSettings {
  if (findSolitudeAtmosphereProfile(settings?.presets?.atmosphere)) {
    return buildSolitudeRuntimeVisualStyle(settings)
  }

  const stylePreset =
    settings?.style?.preset ?? DEFAULT_RUNTIME_VISUAL_STYLE.palettePreset
  const base =
    stylePreset === 'surreal-site'
      ? mergeRuntimeVisualStyle(
          DEFAULT_RUNTIME_VISUAL_STYLE,
          surrealSiteBaseRuntime,
        )
      : DEFAULT_RUNTIME_VISUAL_STYLE

  const atmosphere = buildRuntimeAtmosphereFromLevelSettings(settings, {
    base: runtimeVisualStyleToRuntimeAtmosphere(base, {
      id:
        typeof settings?.presets?.atmosphere === 'string' &&
        settings.presets.atmosphere
          ? settings.presets.atmosphere
          : `level-${stylePreset}`,
    }),
  })

  return mergeRuntimeVisualStyle(base, {
    palettePreset: stylePreset,
    ...runtimeAtmosphereToRuntimeVisualStylePatch(atmosphere),
  })
}
