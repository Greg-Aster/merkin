import type { EditorAtmospherePresetId } from '../engine/sceneDocumentTypes'
import type { StylePreset } from '../styles/StylePalettes'

export type RuntimeAtmosphereSourceKind =
  | 'default'
  | 'scene-settings'
  | 'editor-preview'

export interface RuntimeAtmosphereAuthoredFieldMetadata {
  distanceFog: boolean
  heightFog: boolean
  aerialPerspective: boolean
  mist: boolean
  bloom: boolean
  colorGrading: boolean
}

export interface RuntimeAtmosphereSourceMetadata {
  kind: RuntimeAtmosphereSourceKind
  levelId?: string
  refreshKey?: string
  stylePreset?: StylePreset
  atmospherePreset?: EditorAtmospherePresetId | null
  profileId?: string | null
  authored: RuntimeAtmosphereAuthoredFieldMetadata
}

export interface RuntimeDistanceFogSettings {
  enabled: boolean
  color: string
  density: number
  near?: number
  far?: number
}

export interface RuntimeHeightFogSettings {
  enabled: boolean
  color: string
  density: number
  floor: number
  ceiling: number
  falloff: number
  colorInfluence: number
}

export interface RuntimeAerialPerspectiveSettings {
  enabled: boolean
  skyParticipation: number
  skyOcclusion: number
  horizonBoost: number
  skyFogFalloff: number
}

export interface RuntimeMistSettings {
  enabled: boolean
  color: string
  opacity: number
  layers: number
  height: number
  spacing: number
  scale: number
  driftSpeed: number
}

export interface RuntimeAtmosphereGradingSettings {
  saturation: number
  contrast: number
  brightness: number
  warmth: number
}

export interface RuntimeAtmosphereBloomSettings {
  intensity: number
  threshold: number
}

export interface RuntimeAtmosphereDefinition {
  id: string
  enabled: boolean
  source: RuntimeAtmosphereSourceMetadata
  distanceFog: RuntimeDistanceFogSettings
  heightFog: RuntimeHeightFogSettings
  aerialPerspective: RuntimeAerialPerspectiveSettings
  mist: RuntimeMistSettings
  grading: RuntimeAtmosphereGradingSettings
  bloom: RuntimeAtmosphereBloomSettings
}

export type RuntimeAtmospherePatch = Partial<
  Omit<
    RuntimeAtmosphereDefinition,
    | 'source'
    | 'distanceFog'
    | 'heightFog'
    | 'aerialPerspective'
    | 'mist'
    | 'grading'
    | 'bloom'
  >
> & {
  source?: Partial<Omit<RuntimeAtmosphereSourceMetadata, 'authored'>> & {
    authored?: Partial<RuntimeAtmosphereAuthoredFieldMetadata>
  }
  distanceFog?: Partial<RuntimeDistanceFogSettings>
  heightFog?: Partial<RuntimeHeightFogSettings>
  aerialPerspective?: Partial<RuntimeAerialPerspectiveSettings>
  mist?: Partial<RuntimeMistSettings>
  grading?: Partial<RuntimeAtmosphereGradingSettings>
  bloom?: Partial<RuntimeAtmosphereBloomSettings>
}

function definedPatch<T extends object>(patch: Partial<T> | undefined) {
  const result: Partial<T> = {}

  if (!patch) return result

  for (const [key, value] of Object.entries(patch) as [
    keyof T,
    T[keyof T] | undefined,
  ][]) {
    if (value !== undefined) {
      result[key] = value
    }
  }

  return result
}

export function mergeRuntimeAtmosphere(
  base: RuntimeAtmosphereDefinition,
  overrides: RuntimeAtmospherePatch,
): RuntimeAtmosphereDefinition {
  const rootOverrides = definedPatch(overrides)

  return {
    ...base,
    ...rootOverrides,
    source: {
      ...base.source,
      ...definedPatch(overrides.source),
      authored: {
        ...base.source.authored,
        ...definedPatch(overrides.source?.authored),
      },
    },
    distanceFog: {
      ...base.distanceFog,
      ...definedPatch(overrides.distanceFog),
    },
    heightFog: {
      ...base.heightFog,
      ...definedPatch(overrides.heightFog),
    },
    aerialPerspective: {
      ...base.aerialPerspective,
      ...definedPatch(overrides.aerialPerspective),
    },
    mist: {
      ...base.mist,
      ...definedPatch(overrides.mist),
    },
    grading: {
      ...base.grading,
      ...definedPatch(overrides.grading),
    },
    bloom: {
      ...base.bloom,
      ...definedPatch(overrides.bloom),
    },
  }
}
