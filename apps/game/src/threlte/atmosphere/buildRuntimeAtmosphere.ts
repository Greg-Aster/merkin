import * as THREE from 'three'
import type {
  SceneSettings,
  SharedLevelEditorSettings,
} from '../engine/sceneDocumentTypes'
import {
  DEFAULT_RUNTIME_VISUAL_STYLE,
  type RuntimeVisualStylePatch,
  type RuntimeVisualStyleSettings,
} from '../styles/runtimeVisualStyleStore'
import type {
  RuntimeAtmosphereDefinition,
  RuntimeAtmosphereSourceKind,
} from './runtimeAtmosphereTypes'

export interface RuntimeAtmosphereFogVolume {
  position: [number, number, number]
  scale: [number, number, number]
  color?: string
  density?: number
  falloff?: number
}

export interface BuildRuntimeAtmosphereOptions {
  base?: RuntimeAtmosphereDefinition
  levelId?: string
  refreshKey?: string
  source?: RuntimeAtmosphereSourceKind
  profileId?: string | null
}

const DEFAULT_DISTANCE_FOG_DENSITY = 0.0012

function finiteNumberOrDefault(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function resolveSkyOcclusion(
  distanceFogDensity: number,
  heightFogDensity: number,
) {
  return clampNumber(distanceFogDensity * 240 + heightFogDensity * 160, 0, 1)
}

function resolveHorizonBoost(
  distanceFogDensity: number,
  heightFogDensity: number,
) {
  return clampNumber(distanceFogDensity * 220 + heightFogDensity * 120, 0, 1)
}

function normalizeColor(value: string | undefined, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function blendHexColors(base: string, target: string, amount: number) {
  try {
    const from = new THREE.Color(normalizeColor(base, '#7b8797'))
    const to = new THREE.Color(normalizeColor(target, base))
    return `#${from.lerp(to, clampNumber(amount, 0, 1)).getHexString()}`
  } catch {
    return normalizeColor(base, '#7b8797')
  }
}

function createDefaultAuthoredMetadata() {
  return {
    distanceFog: false,
    heightFog: false,
    aerialPerspective: false,
    mist: false,
    bloom: false,
    colorGrading: false,
  }
}

export function runtimeVisualStyleToRuntimeAtmosphere(
  visualStyle: RuntimeVisualStyleSettings,
  options: {
    id?: string
    distanceFogColor?: string
    distanceFogDensity?: number
    levelId?: string
    refreshKey?: string
    source?: RuntimeAtmosphereSourceKind
    profileId?: string | null
  } = {},
): RuntimeAtmosphereDefinition {
  const heightFog = visualStyle.heightFog
  const distanceFogDensity = Math.max(
    0,
    finiteNumberOrDefault(
      options.distanceFogDensity,
      Math.max(DEFAULT_DISTANCE_FOG_DENSITY, heightFog.density),
    ),
  )
  const heightFogDensity = Math.max(
    0,
    finiteNumberOrDefault(heightFog.density, 0),
  )
  const heightFogFloor = finiteNumberOrDefault(heightFog.floor, 0.6)
  const heightFogCeiling = Math.max(
    heightFogFloor + 0.001,
    finiteNumberOrDefault(heightFog.ceiling, heightFogFloor + 6),
  )
  const heightFogFalloff = 1
  const mistOpacity = clampNumber(
    finiteNumberOrDefault(heightFog.mistOpacity, 0),
    0,
    1,
  )
  const mistLayers = Math.max(
    0,
    Math.round(finiteNumberOrDefault(heightFog.mistLayers, 0)),
  )
  const aerialPerspectiveEnabled =
    distanceFogDensity > 0 || heightFogDensity > 0
  const skyParticipation = aerialPerspectiveEnabled ? 1 : 0

  return {
    id: options.id ?? visualStyle.id,
    enabled: true,
    source: {
      kind: options.source ?? 'default',
      levelId: options.levelId,
      refreshKey: options.refreshKey,
      stylePreset: visualStyle.palettePreset,
      atmospherePreset: null,
      profileId: options.profileId ?? null,
      authored: createDefaultAuthoredMetadata(),
    },
    distanceFog: {
      enabled: distanceFogDensity > 0,
      color: normalizeColor(options.distanceFogColor, heightFog.color),
      density: distanceFogDensity,
    },
    heightFog: {
      enabled: heightFogDensity > 0 && heightFogCeiling > heightFogFloor,
      color: normalizeColor(heightFog.color, '#7b8797'),
      density: heightFogDensity,
      floor: heightFogFloor,
      ceiling: heightFogCeiling,
      falloff: heightFogFalloff,
      colorInfluence: clampNumber(
        finiteNumberOrDefault(heightFog.colorInfluence, 0.28),
        0,
        1,
      ),
    },
    aerialPerspective: {
      enabled: aerialPerspectiveEnabled,
      skyParticipation,
      skyOcclusion: resolveSkyOcclusion(distanceFogDensity, heightFogDensity),
      horizonBoost: resolveHorizonBoost(distanceFogDensity, heightFogDensity),
      skyFogFalloff: heightFogFalloff,
    },
    mist: {
      enabled: mistOpacity > 0.001 && mistLayers > 0,
      color: normalizeColor(heightFog.color, '#7b8797'),
      opacity: mistOpacity,
      layers: mistLayers,
      height: Math.max(0, finiteNumberOrDefault(heightFog.mistHeight, 0)),
      spacing: Math.max(
        0.02,
        finiteNumberOrDefault(heightFog.mistSpacing, 0.44),
      ),
      scale: Math.max(1, finiteNumberOrDefault(heightFog.mistScale, 320)),
      driftSpeed: finiteNumberOrDefault(heightFog.mistDriftSpeed, 0.035),
    },
    grading: {
      saturation: finiteNumberOrDefault(visualStyle.colorGrading.saturation, 1),
      contrast: finiteNumberOrDefault(visualStyle.colorGrading.contrast, 1),
      brightness: finiteNumberOrDefault(visualStyle.colorGrading.brightness, 1),
      warmth: finiteNumberOrDefault(visualStyle.colorGrading.warmth, 1),
    },
    bloom: {
      intensity: Math.max(
        0,
        finiteNumberOrDefault(visualStyle.screenFx.bloomIntensity, 0),
      ),
      threshold: clampNumber(
        finiteNumberOrDefault(visualStyle.screenFx.bloomThreshold, 0.86),
        0,
        1,
      ),
    },
  }
}

export const DEFAULT_RUNTIME_ATMOSPHERE = runtimeVisualStyleToRuntimeAtmosphere(
  DEFAULT_RUNTIME_VISUAL_STYLE,
)

export function buildRuntimeAtmosphereFromLevelSettings(
  settings: SharedLevelEditorSettings | null | undefined,
  options: BuildRuntimeAtmosphereOptions = {},
): RuntimeAtmosphereDefinition {
  const base = options.base ?? DEFAULT_RUNTIME_ATMOSPHERE
  const styleEnabled = settings?.style?.enabled ?? true
  const fogEnabled = settings?.style?.fogEnabled ?? true
  const fog = settings?.style?.fog
  const haze = settings?.style?.haze
  const grading = settings?.style?.colorGrading
  const bloom = settings?.style?.bloom
  const id =
    typeof settings?.presets?.atmosphere === 'string' &&
    settings.presets.atmosphere
      ? settings.presets.atmosphere
      : base.id

  const distanceFogColor = normalizeColor(fog?.color, base.distanceFog.color)
  const heightFogColor = normalizeColor(haze?.color, distanceFogColor)
  const distanceFogDensity = Math.max(
    0,
    finiteNumberOrDefault(fog?.density, base.distanceFog.density),
  )
  const heightFogFloor = finiteNumberOrDefault(
    haze?.floor,
    base.heightFog.floor,
  )
  const heightFogCeiling = Math.max(
    heightFogFloor + 0.001,
    finiteNumberOrDefault(haze?.ceiling, base.heightFog.ceiling),
  )
  const heightFogDensity = Math.max(
    0,
    finiteNumberOrDefault(haze?.density, base.heightFog.density),
  )
  const heightFogFalloff = Math.max(
    0.001,
    finiteNumberOrDefault(haze?.falloff, base.heightFog.falloff),
  )
  const mistOpacity = clampNumber(
    finiteNumberOrDefault(haze?.mistOpacity, base.mist.opacity),
    0,
    1,
  )
  const mistLayers = Math.max(
    0,
    Math.round(finiteNumberOrDefault(haze?.mistLayers, base.mist.layers)),
  )
  const hasAuthoredSkyParticipation =
    typeof settings?.skybox?.fogOpacity === 'number'
  const hasAuthoredSkyFogFalloff =
    typeof settings?.skybox?.fogFalloff === 'number'
  const skyParticipation = clampNumber(
    finiteNumberOrDefault(
      hasAuthoredSkyParticipation
        ? settings?.skybox?.fogOpacity
        : base.aerialPerspective.skyParticipation,
      0,
    ),
    0,
    1,
  )
  const skyFogFalloff = Math.max(
    0.001,
    finiteNumberOrDefault(settings?.skybox?.fogFalloff, heightFogFalloff),
  )
  const skyOcclusion = resolveSkyOcclusion(distanceFogDensity, heightFogDensity)
  const horizonBoost = resolveHorizonBoost(distanceFogDensity, heightFogDensity)
  const aerialPerspectiveEnabled =
    styleEnabled &&
    fogEnabled &&
    skyParticipation > 0.001 &&
    (distanceFogDensity > 0 || heightFogDensity > 0)

  return {
    id,
    enabled: styleEnabled,
    source: {
      ...base.source,
      kind: options.source ?? (settings ? 'scene-settings' : 'default'),
      levelId: options.levelId ?? base.source.levelId,
      refreshKey: options.refreshKey ?? base.source.refreshKey,
      stylePreset: settings?.style?.preset ?? base.source.stylePreset,
      atmospherePreset:
        settings?.presets?.atmosphere ?? base.source.atmospherePreset ?? null,
      profileId: options.profileId ?? base.source.profileId ?? null,
      authored: {
        ...base.source.authored,
        distanceFog: Boolean(fog),
        heightFog: Boolean(haze),
        aerialPerspective:
          hasAuthoredSkyParticipation ||
          hasAuthoredSkyFogFalloff ||
          base.source.authored.aerialPerspective,
        mist: Boolean(haze),
        bloom: Boolean(bloom),
        colorGrading: Boolean(grading),
      },
    },
    distanceFog: {
      ...base.distanceFog,
      enabled: styleEnabled && fogEnabled && distanceFogDensity > 0,
      color: distanceFogColor,
      density: distanceFogDensity,
    },
    heightFog: {
      ...base.heightFog,
      enabled:
        styleEnabled &&
        fogEnabled &&
        heightFogDensity > 0 &&
        heightFogCeiling > heightFogFloor,
      color: heightFogColor,
      density: heightFogDensity,
      floor: heightFogFloor,
      ceiling: heightFogCeiling,
      falloff: heightFogFalloff,
      colorInfluence: clampNumber(
        finiteNumberOrDefault(
          haze?.colorInfluence,
          base.heightFog.colorInfluence,
        ),
        0,
        1,
      ),
    },
    aerialPerspective: {
      ...base.aerialPerspective,
      enabled: aerialPerspectiveEnabled,
      skyParticipation,
      skyOcclusion,
      horizonBoost,
      skyFogFalloff,
    },
    mist: {
      ...base.mist,
      enabled:
        styleEnabled && fogEnabled && mistOpacity > 0.001 && mistLayers > 0,
      color: heightFogColor,
      opacity: mistOpacity,
      layers: mistLayers,
      height: Math.max(
        0,
        finiteNumberOrDefault(haze?.mistHeight, base.mist.height),
      ),
      spacing: Math.max(
        0.02,
        finiteNumberOrDefault(haze?.mistSpacing, base.mist.spacing),
      ),
      scale: Math.max(
        1,
        finiteNumberOrDefault(haze?.mistScale, base.mist.scale),
      ),
      driftSpeed: finiteNumberOrDefault(
        haze?.mistDriftSpeed,
        base.mist.driftSpeed,
      ),
    },
    grading: {
      saturation: finiteNumberOrDefault(
        grading?.saturation,
        base.grading.saturation,
      ),
      contrast: finiteNumberOrDefault(grading?.contrast, base.grading.contrast),
      brightness: finiteNumberOrDefault(
        grading?.brightness,
        base.grading.brightness,
      ),
      warmth: finiteNumberOrDefault(grading?.warmth, base.grading.warmth),
    },
    bloom: {
      intensity: Math.max(
        0,
        finiteNumberOrDefault(bloom?.intensity, base.bloom.intensity),
      ),
      threshold: clampNumber(
        finiteNumberOrDefault(bloom?.threshold, base.bloom.threshold),
        0,
        1,
      ),
    },
  }
}

export function buildRuntimeAtmosphereFromSceneSettings(
  settings: SceneSettings | null | undefined,
  options: BuildRuntimeAtmosphereOptions = {},
): RuntimeAtmosphereDefinition {
  return buildRuntimeAtmosphereFromLevelSettings(settings?.level, options)
}

export function runtimeAtmosphereToRuntimeVisualStylePatch(
  atmosphere: RuntimeAtmosphereDefinition,
): RuntimeVisualStylePatch {
  return {
    id: atmosphere.id,
    heightFog: {
      color: atmosphere.heightFog.color,
      density: atmosphere.heightFog.enabled ? atmosphere.heightFog.density : 0,
      floor: atmosphere.heightFog.floor,
      ceiling: atmosphere.heightFog.ceiling,
      colorInfluence: atmosphere.heightFog.colorInfluence,
      mistOpacity: atmosphere.mist.enabled ? atmosphere.mist.opacity : 0,
      mistLayers: atmosphere.mist.layers,
      mistHeight: atmosphere.mist.height,
      mistSpacing: atmosphere.mist.spacing,
      mistScale: atmosphere.mist.scale,
      mistDriftSpeed: atmosphere.mist.driftSpeed,
    },
    colorGrading: {
      saturation: atmosphere.grading.saturation,
      contrast: atmosphere.grading.contrast,
      brightness: atmosphere.grading.brightness,
      warmth: atmosphere.grading.warmth,
    },
    screenFx: {
      bloomIntensity: atmosphere.bloom.intensity,
      bloomThreshold: atmosphere.bloom.threshold,
    },
  }
}

export function withRuntimeAtmosphereFogVolumes(
  atmosphere: RuntimeAtmosphereDefinition,
  {
    fogVolumes,
    playerPosition,
  }: {
    fogVolumes: RuntimeAtmosphereFogVolume[]
    playerPosition: [number, number, number]
  },
): RuntimeAtmosphereDefinition {
  if (!fogVolumes.length) return atmosphere

  let strongestInfluence = 0
  let targetColor = atmosphere.distanceFog.color
  let targetDensity = atmosphere.distanceFog.density

  for (const volume of fogVolumes) {
    const [px, py, pz] = playerPosition
    const [cx, cy, cz] = volume.position
    const [sx, sy, sz] = volume.scale.map(value => Math.abs(value) / 2) as [
      number,
      number,
      number,
    ]
    const dx = Math.max(Math.abs(px - cx) - sx, 0)
    const dy = Math.max(Math.abs(py - cy) - sy, 0)
    const dz = Math.max(Math.abs(pz - cz) - sz, 0)
    const outsideDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const falloff = volume.falloff ?? 8
    const influence =
      outsideDistance <= 0.0001
        ? 1
        : outsideDistance >= falloff
          ? 0
          : 1 - outsideDistance / Math.max(0.001, falloff)

    if (influence <= strongestInfluence) continue

    strongestInfluence = influence
    targetColor = normalizeColor(volume.color, targetColor)
    targetDensity = finiteNumberOrDefault(volume.density, targetDensity)
  }

  if (strongestInfluence <= 0) return atmosphere

  return {
    ...atmosphere,
    distanceFog: {
      ...atmosphere.distanceFog,
      enabled: atmosphere.enabled,
      color: blendHexColors(
        atmosphere.distanceFog.color,
        targetColor,
        strongestInfluence,
      ),
      density:
        atmosphere.distanceFog.density +
        (targetDensity - atmosphere.distanceFog.density) * strongestInfluence,
    },
  }
}
